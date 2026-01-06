const { db } = require('../src/db');
const { hashPassword } = require('../src/utils/auth');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('--- LoanVision 用户创建工具 ---');
  
  try {
    const username = await question('请输入用户名: ');
    if (!username) {
      console.error('错误: 用户名不能为空');
      process.exit(1);
    }

    // 检查用户是否已存在
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      console.error('错误: 用户名已存在');
      process.exit(1);
    }

    const password = await question('请输入密码: ');
    if (!password || password.length < 6) {
      console.error('错误: 密码长度必须至少为 6 位');
      process.exit(1);
    }

    const hashedPassword = await hashPassword(password);
    
    const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    stmt.run(username, hashedPassword);
    
    console.log(`\n成功: 用户 "${username}" 已创建！`);
  } catch (err) {
    console.error('\n发生错误:', err.message);
  } finally {
    rl.close();
    process.exit(0);
  }
}

main();
