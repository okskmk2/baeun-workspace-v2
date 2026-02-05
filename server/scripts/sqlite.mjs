import sql from "better-sqlite3";

const db = sql("baeun-workspace.sqlite");
const row = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
console.log(row.firstName, row.lastName, row.email);
