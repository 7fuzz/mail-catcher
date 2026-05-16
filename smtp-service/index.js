const { SMTPServer } = require("smtp-server");
const { simpleParser } = require("mailparser");
const Database = require("better-sqlite3");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

const DB_PATH = process.env.DB_PATH || "./data/mail-catcher.db";
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/attachments";

// Ensure directories exist
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS mail_credentials (
    credential_id TEXT PRIMARY KEY,
    smtp_user TEXT UNIQUE,
    smtp_password TEXT,
    max_emails INTEGER DEFAULT 100,
    max_size_mb INTEGER DEFAULT 50
  );

  CREATE TABLE IF NOT EXISTS caught_emails (
    email_id TEXT PRIMARY KEY,
    credential_id TEXT,
    sender TEXT,
    recipient TEXT,
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (credential_id) REFERENCES mail_credentials(credential_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS attachments (
    attachment_id TEXT PRIMARY KEY,
    entity_type TEXT,
    entity_id TEXT,
    url TEXT,
    name TEXT,
    FOREIGN KEY (entity_id) REFERENCES caught_emails(email_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS web_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password_hash TEXT,
    role TEXT DEFAULT 'VIEWER' -- 'ADMIN' or 'VIEWER'
  );

  CREATE TABLE IF NOT EXISTS user_inbox_access (
    user_id TEXT,
    credential_id TEXT,
    PRIMARY KEY (user_id, credential_id),
    FOREIGN KEY (user_id) REFERENCES web_users(id) ON DELETE CASCADE,
    FOREIGN KEY (credential_id) REFERENCES mail_credentials(credential_id) ON DELETE CASCADE
  );
`);

// Insert default credential if none exist for testing
const defaultCred = db.prepare("SELECT * FROM mail_credentials LIMIT 1").get();
if (!defaultCred) {
  db.prepare("INSERT INTO mail_credentials (credential_id, smtp_user, smtp_password) VALUES (?, ?, ?)")
    .run(uuidv4(), "admin", "admin");
  console.log("Default SMTP credential created: admin / admin");
}

// Insert default web admin if none exist
const defaultWebUser = db.prepare("SELECT * FROM web_users LIMIT 1").get();
if (!defaultWebUser) {
  // Use a simple hash for 'admin' (this is a placeholder, Next.js app will handle proper hashing)
  // For now, we'll just put 'admin' as password and the Next.js app can deal with it or we hash it here if we had bcrypt
  db.prepare("INSERT INTO web_users (id, username, password_hash, role) VALUES (?, ?, ?, ?)")
    .run(uuidv4(), "admin", "admin", "ADMIN");
  console.log("Default Web Admin created: admin / admin");
}

const server = new SMTPServer({
  authOptional: false,
  onAuth(auth, session, callback) {
    authenticate(auth.username, auth.password)
      .then((credential) => {
        if (credential) {
          callback(null, { user: credential });
        } else {
          callback(new Error("Invalid username or password"));
        }
      })
      .catch((err) => {
        console.error("Auth Error:", err);
        callback(new Error("Internal Server Error"));
      });
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

async function authenticate(username, password) {
  return db.prepare("SELECT credential_id, smtp_user, max_emails, max_size_mb FROM mail_credentials WHERE smtp_user = ? AND smtp_password = ?")
    .get(username, password);
}

function formatAddress(parsedAddr, envelopeAddr, smtpUser) {
  if (parsedAddr && parsedAddr.value && parsedAddr.value.length > 0) {
    const first = parsedAddr.value[0];
    let name = first.name;
    if (name && name.trim()) {
      if (smtpUser) name = name.replace(smtpUser, '').trim();
      return name ? `${name} <${first.address}>` : first.address;
    }
    return first.address;
  }
  return envelopeAddr || "(Unknown)";
}

async function saveEmail(credential, parsed, envelope) {
  const credentialId = credential.credential_id;
  const emailId = uuidv4();
  
  const sender = formatAddress(parsed.from, envelope.mailFrom ? envelope.mailFrom.address : null, credential.smtp_user);
  
  let recipient = "";
  if (parsed.to && parsed.to.value && parsed.to.value.length > 0) {
    recipient = parsed.to.value.map(addr => {
        let name = addr.name;
        if (name && name.trim()) {
            if (credential.smtp_user) name = name.replace(credential.smtp_user, '').trim();
            return name ? `${name} <${addr.address}>` : addr.address;
        }
        return addr.address;
    }).join(", ");
  } else {
    recipient = envelope.rcptTo ? envelope.rcptTo.map(r => r.address).join(", ") : "(Unknown Recipient)";
  }
  
  db.prepare(
    "INSERT INTO caught_emails (email_id, credential_id, sender, recipient, subject, body_text, body_html) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    emailId,
    credentialId,
    sender,
    recipient,
    parsed.subject || "(No Subject)",
    parsed.text || "",
    parsed.html || ""
  );

  if (parsed.attachments && parsed.attachments.length > 0) {
    for (const attachment of parsed.attachments) {
      const attachmentId = uuidv4();
      const ext = path.extname(attachment.filename);
      const fileName = `${attachmentId}${ext}`;
      const filePath = path.join(UPLOAD_DIR, fileName);
      
      fs.writeFileSync(filePath, attachment.content);
      
      const publicUrl = `/uploads/mail/${fileName}`;
      
      db.prepare(
        "INSERT INTO attachments (attachment_id, entity_type, entity_id, url, name) VALUES (?, ?, ?, ?, ?)"
      ).run(attachmentId, 'EMAIL', emailId, publicUrl, attachment.filename);
    }
  }
  
  console.log(`[${new Date().toISOString()}] Caught email for cred ${credentialId}: ${parsed.subject}`);

  try {
    rotateEmails(credential);
  } catch (err) {
    console.error("Rotation Error:", err);
  }
}

function rotateEmails(credential) {
  const { credential_id, max_emails, max_size_mb } = credential;

  // 1. Check Count Limit
  const countRows = db.prepare(
    "SELECT email_id FROM caught_emails WHERE credential_id = ? ORDER BY created_at DESC"
  ).all(credential_id);

  if (countRows.length > max_emails) {
    const toDelete = countRows.slice(max_emails);
    for (const row of toDelete) {
      deleteEmailFull(row.email_id);
    }
    console.log(`Rotated ${toDelete.length} emails (count limit reached)`);
  }

  // 2. Check Size Limit
  const attRows = db.prepare(`
    SELECT a.attachment_id, a.url, ce.email_id 
    FROM attachments a
    JOIN caught_emails ce ON a.entity_id = ce.email_id
    WHERE ce.credential_id = ? AND a.entity_type = 'EMAIL'
    ORDER BY ce.created_at ASC
  `).all(credential_id);

  let totalBytes = 0;
  const files = [];
  for (const att of attRows) {
    const fileName = path.basename(att.url);
    const filePath = path.join(UPLOAD_DIR, fileName);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      totalBytes += stats.size;
      files.push({ email_id: att.email_id, size: stats.size });
    }
  }

  const maxBytes = max_size_mb * 1024 * 1024;
  if (totalBytes > maxBytes) {
    console.log(`Size limit exceeded: ${(totalBytes / 1024 / 1024).toFixed(2)}MB / ${max_size_mb}MB. Pruning...`);
    const allEmailsOldest = db.prepare(
        "SELECT email_id FROM caught_emails WHERE credential_id = ? ORDER BY created_at ASC"
    ).all(credential_id);

    for (const email of allEmailsOldest) {
        if (totalBytes <= maxBytes) break;
        
        const emailAtts = attRows.filter(a => a.email_id === email.email_id);
        for (const ea of emailAtts) {
            const fileName = path.basename(ea.url);
            const filePath = path.join(UPLOAD_DIR, fileName);
            if (fs.existsSync(filePath)) {
                totalBytes -= fs.statSync(filePath).size;
            }
        }
        deleteEmailFull(email.email_id);
    }
  }
}

function deleteEmailFull(emailId) {
  const atts = db.prepare(
    "SELECT url FROM attachments WHERE entity_type = 'EMAIL' AND entity_id = ?"
  ).all(emailId);

  for (const att of atts) {
    const fileName = path.basename(att.url);
    const filePath = path.join(UPLOAD_DIR, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  db.prepare("DELETE FROM caught_emails WHERE email_id = ?").run(emailId);
}

const PORT = process.env.SMTP_PORT || 25;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`SMTP Listener running on port ${PORT}`);
});
