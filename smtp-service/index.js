const { SMTPServer } = require("smtp-server");
const { simpleParser } = require("mailparser");
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./attachments";

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Initial Seed logic
async function seed() {
  try {
    const credCount = await prisma.mailCredential.count();
    if (credCount === 0) {
      await prisma.mailCredential.create({
        data: {
          smtpUser: "admin",
          smtpPassword: "admin",
        },
      });
      console.log("Default SMTP credential created: admin / admin");
    }

    const userCount = await prisma.webUser.count();
    if (userCount === 0) {
      await prisma.webUser.create({
        data: {
          username: "admin",
          passwordHash: "admin", // Placeholder, Next.js handles hashing
          role: "ADMIN",
        },
      });
      console.log("Default Web Admin created: admin / admin");
    }
  } catch (err) {
    console.error("Seed Error (Database might not be ready):", err.message);
  }
}

seed();

const server = new SMTPServer({
  authOptional: false,
  async onAuth(auth, session, callback) {
    try {
      const credential = await prisma.mailCredential.findUnique({
        where: {
          smtpUser: auth.username,
        },
      });

      if (credential && credential.smtpPassword === auth.password) {
        if (!credential.isActive) {
          callback(new Error("This inbox is currently disabled"));
          return;
        }
        callback(null, { user: credential });
      } else {
        callback(new Error("Invalid username or password"));
      }
    } catch (err) {
      console.error("Auth Error:", err);
      callback(new Error("Internal Server Error"));
    }
  },
  onData(stream, session, callback) {
    simpleParser(stream)
      .then((parsed) => {
        return saveEmail(session.user, parsed, session.envelope);
      })
      .then(() => callback())
      .catch((err) => {
        console.error("Mail Error:", err);
        callback(new Error("Failed to save email"));
      });
  },
});

function formatAddress(parsedAddr, envelopeAddr, smtpUser) {
  if (parsedAddr && parsedAddr.value && parsedAddr.value.length > 0) {
    const first = parsedAddr.value[0];
    let name = first.name;
    if (name && name.trim()) {
      if (smtpUser) name = name.replace(smtpUser, "").trim();
      return name ? `${name} <${first.address}>` : first.address;
    }
    return first.address;
  }
  return envelopeAddr || "(Unknown)";
}

async function saveEmail(credential, parsed, envelope) {
  const sender = formatAddress(
    parsed.from,
    envelope.mailFrom ? envelope.mailFrom.address : null,
    credential.smtpUser
  );

  let recipient = "";
  if (parsed.to && parsed.to.value && parsed.to.value.length > 0) {
    recipient = parsed.to.value
      .map((addr) => {
        let name = addr.name;
        if (name && name.trim()) {
          if (credential.smtpUser) name = name.replace(credential.smtpUser, "").trim();
          return name ? `${name} <${addr.address}>` : addr.address;
        }
        return addr.address;
      })
      .join(", ");
  } else {
    recipient = envelope.rcptTo
      ? envelope.rcptTo.map((r) => r.address).join(", ")
      : "(Unknown Recipient)";
  }

  const email = await prisma.caughtEmail.create({
    data: {
      credentialId: credential.credentialId,
      sender,
      recipient,
      subject: parsed.subject || "(No Subject)",
      bodyText: parsed.text || "",
      bodyHtml: parsed.html || "",
    },
  });

  if (parsed.attachments && parsed.attachments.length > 0) {
    for (const attachment of parsed.attachments) {
      const ext = path.extname(attachment.filename || "");
      const fileName = `${require("uuid").v4()}${ext}`;
      const filePath = path.join(UPLOAD_DIR, fileName);

      fs.writeFileSync(filePath, attachment.content);

      const publicUrl = `/uploads/mail/${fileName}`;

      await prisma.attachment.create({
        data: {
          entityType: "EMAIL",
          entityId: email.emailId,
          url: publicUrl,
          name: attachment.filename || "unnamed",
          size: attachment.content.length,
        },
      });
    }
  }

  console.log(`[${new Date().toISOString()}] Caught email for cred ${credential.credentialId}: ${parsed.subject}`);

  try {
    await rotateEmails(credential);
  } catch (err) {
    console.error("Rotation Error:", err);
  }
}

async function rotateEmails(credential) {
  const { credentialId, maxEmails, maxSizeMb } = credential;

  // 1. Check Count Limit
  const emails = await prisma.caughtEmail.findMany({
    where: { credentialId },
    orderBy: { createdAt: "desc" },
  });

  if (emails.length > maxEmails) {
    const toDelete = emails.slice(maxEmails);
    for (const email of toDelete) {
      await deleteEmailFull(email.emailId);
    }
    console.log(`Rotated ${toDelete.length} emails (count limit reached)`);
  }

  // 2. Check Size Limit (Precise via DB)
  const attachments = await prisma.attachment.findMany({
    where: {
      email: {
        credentialId: credentialId,
      },
      entityType: "EMAIL",
    },
  });

  let totalBytes = attachments.reduce((sum, a) => sum + a.size, 0);
  
  // Add body sizes (approximate: 1 char = 1 byte for most cases)
  const allEmails = await prisma.caughtEmail.findMany({
    where: { credentialId },
    select: { bodyText: true, bodyHtml: true }
  });
  totalBytes += allEmails.reduce((sum, e) => sum + (e.bodyText?.length || 0) + (e.bodyHtml?.length || 0), 0);

  const maxBytes = maxSizeMb * 1024 * 1024;
  if (totalBytes > maxBytes) {
    console.log(`Size limit exceeded: ${(totalBytes / 1024 / 1024).toFixed(2)}MB / ${maxSizeMb}MB. Pruning...`);
    const oldestEmails = await prisma.caughtEmail.findMany({
      where: { credentialId },
      orderBy: { createdAt: "asc" },
      include: { attachments: true }
    });

    for (const email of oldestEmails) {
      if (totalBytes <= maxBytes) break;

      const emailSize = (email.bodyText?.length || 0) + (email.bodyHtml?.length || 0) + 
                        email.attachments.reduce((sum, a) => sum + a.size, 0);
      
      await deleteEmailFull(email.emailId);
      totalBytes -= emailSize;
    }
  }
}

async function deleteEmailFull(emailId) {
  const atts = await prisma.attachment.findMany({
    where: { entityType: "EMAIL", entityId: emailId },
  });

  for (const att of atts) {
    const fileName = path.basename(att.url);
    const filePath = path.join(UPLOAD_DIR, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await prisma.caughtEmail.delete({
    where: { emailId },
  });
}

const PORT = process.env.SMTP_PORT || 25;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`SMTP Listener running on port ${PORT}`);
});
