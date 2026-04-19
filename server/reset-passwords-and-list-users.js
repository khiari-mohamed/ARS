/**
 * 🔐 RESET ALL PASSWORDS & GENERATE USER LIST
 * 
 * Purpose: Reset all user passwords to Azerty123@ and generate a comprehensive
 *          list of all users with their credentials for testing different roles
 * 
 * Usage: node reset-passwords-and-list-users.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const NEW_PASSWORD = 'Azerty123@';
const SALT_ROUNDS = 10;

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

async function resetPasswordsAndListUsers() {
  console.log('\n' + '═'.repeat(100));
  console.log('🔐 RESET ALL PASSWORDS & GENERATE USER LIST');
  console.log('═'.repeat(100) + '\n');

  try {
    // Step 1: Hash the new password
    console.log('🔒 Hashing new password...');
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, SALT_ROUNDS);
    console.log('✅ Password hashed successfully\n');

    // Step 2: Get all users
    console.log('👥 Fetching all users from database...');
    const users = await prisma.user.findMany({
      orderBy: [
        { role: 'asc' },
        { fullName: 'asc' }
      ],
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        active: true,
      }
    });

    console.log(`✅ Found ${users.length} users\n`);

    // Step 3: Update all passwords
    console.log('🔄 Updating all passwords to: ' + NEW_PASSWORD);
    console.log('─'.repeat(100) + '\n');

    let updatedCount = 0;
    const userList = [];

    for (const user of users) {
      try {
        // Update password
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword }
        });

        updatedCount++;

        // Add to user list
        userList.push({
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          department: user.department || 'N/A',
          active: user.active,
          password: NEW_PASSWORD
        });

        console.log(`✅ [${updatedCount}/${users.length}] ${user.fullName} (${user.role})`);
      } catch (error) {
        console.error(`❌ Failed to update ${user.fullName}:`, error.message);
      }
    }

    console.log('\n' + '─'.repeat(100));
    console.log(`✅ Successfully updated ${updatedCount}/${users.length} passwords\n`);

    // Step 4: Generate reports
    console.log('📊 Generating reports...\n');

    // Console output
    displayUserList(userList);

    // CSV file
    generateCSV(userList);

    // Markdown file
    generateMarkdown(userList);

    // JSON file
    generateJSON(userList);

    console.log('\n' + '═'.repeat(100));
    console.log('✅ ALL DONE!');
    console.log('═'.repeat(100) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DISPLAY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function displayUserList(userList) {
  console.log('═'.repeat(100));
  console.log('👥 USER CREDENTIALS LIST - FOR TESTING');
  console.log('═'.repeat(100) + '\n');

  // Group by role
  const byRole = {};
  userList.forEach(user => {
    if (!byRole[user.role]) byRole[user.role] = [];
    byRole[user.role].push(user);
  });

  // Display by role
  Object.keys(byRole).sort().forEach(role => {
    console.log(`\n📌 ${role} (${byRole[role].length} users)`);
    console.log('─'.repeat(100));

    byRole[role].forEach((user, index) => {
      console.log(`\n[${index + 1}] ${user.fullName}`);
      console.log(`    Email:      ${user.email}`);
      console.log(`    Password:   ${user.password}`);
      console.log(`    Role:       ${user.role}`);
      console.log(`    Department: ${user.department}`);
      console.log(`    Active:     ${user.active ? '✅ Yes' : '❌ No'}`);
    });
  });

  console.log('\n' + '═'.repeat(100) + '\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE GENERATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function generateCSV(userList) {
  const csvPath = path.join(process.cwd(), 'USER_CREDENTIALS.csv');

  const headers = ['Full Name', 'Email', 'Password', 'Role', 'Department', 'Active'];
  const rows = userList.map(user => [
    user.fullName,
    user.email,
    user.password,
    user.role,
    user.department,
    user.active ? 'Yes' : 'No'
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  fs.writeFileSync(csvPath, csvContent, 'utf8');
  console.log(`✅ CSV file generated: ${csvPath}`);
}

function generateMarkdown(userList) {
  const mdPath = path.join(process.cwd(), 'USER_CREDENTIALS.md');

  let content = `# 🔐 User Credentials - Testing Access\n\n`;
  content += `**Generated:** ${new Date().toLocaleString('fr-FR')}\n`;
  content += `**Total Users:** ${userList.length}\n`;
  content += `**Default Password:** \`${NEW_PASSWORD}\`\n\n`;
  content += `---\n\n`;

  // Group by role
  const byRole = {};
  userList.forEach(user => {
    if (!byRole[user.role]) byRole[user.role] = [];
    byRole[user.role].push(user);
  });

  // Generate table for each role
  Object.keys(byRole).sort().forEach(role => {
    content += `## 📌 ${role} (${byRole[role].length} users)\n\n`;
    content += `| Name | Email | Password | Department | Active |\n`;
    content += `|------|-------|----------|------------|--------|\n`;

    byRole[role].forEach(user => {
      content += `| ${user.fullName} | ${user.email} | \`${user.password}\` | ${user.department} | ${user.active ? '✅' : '❌'} |\n`;
    });

    content += `\n`;
  });

  // Add quick reference section
  content += `---\n\n`;
  content += `## 🚀 Quick Test Access\n\n`;
  content += `### By Role:\n\n`;

  Object.keys(byRole).sort().forEach(role => {
    const firstUser = byRole[role][0];
    content += `**${role}:**\n`;
    content += `- Email: \`${firstUser.email}\`\n`;
    content += `- Password: \`${NEW_PASSWORD}\`\n\n`;
  });

  // Add login instructions
  content += `---\n\n`;
  content += `## 📝 Login Instructions\n\n`;
  content += `1. Go to the login page\n`;
  content += `2. Enter the email from the list above\n`;
  content += `3. Enter password: \`${NEW_PASSWORD}\`\n`;
  content += `4. Click "Se connecter"\n\n`;

  // Add role descriptions
  content += `---\n\n`;
  content += `## 📚 Role Descriptions\n\n`;
  content += `| Role | Description | Access Level |\n`;
  content += `|------|-------------|-------------|\n`;
  content += `| **SUPER_ADMIN** | Full system access | 🔴 Highest |\n`;
  content += `| **ADMINISTRATEUR** | Administrative access | 🔴 High |\n`;
  content += `| **RESPONSABLE_DEPARTEMENT** | Department management | 🟠 High |\n`;
  content += `| **CHEF_EQUIPE** | Team leader, manages gestionnaires | 🟡 Medium |\n`;
  content += `| **GESTIONNAIRE_SENIOR** | Senior processor, advanced features | 🟢 Medium |\n`;
  content += `| **GESTIONNAIRE** | Standard processor | 🟢 Standard |\n`;
  content += `| **FINANCE** | Financial operations | 🟡 Medium |\n`;
  content += `| **BUREAU_ORDRE** | Document reception | 🟢 Standard |\n`;
  content += `| **SCAN** | Document scanning | 🟢 Standard |\n\n`;

  // Add security warning
  content += `---\n\n`;
  content += `## ⚠️ Security Warning\n\n`;
  content += `**This file contains sensitive credentials!**\n\n`;
  content += `- 🔒 Keep this file secure\n`;
  content += `- 🚫 Do NOT commit to version control\n`;
  content += `- 🗑️ Delete after testing\n`;
  content += `- 🔄 Change passwords in production\n\n`;

  fs.writeFileSync(mdPath, content, 'utf8');
  console.log(`✅ Markdown file generated: ${mdPath}`);
}

function generateJSON(userList) {
  const jsonPath = path.join(process.cwd(), 'USER_CREDENTIALS.json');

  const jsonData = {
    generatedAt: new Date().toISOString(),
    totalUsers: userList.length,
    defaultPassword: NEW_PASSWORD,
    users: userList,
    byRole: {}
  };

  // Group by role
  userList.forEach(user => {
    if (!jsonData.byRole[user.role]) {
      jsonData.byRole[user.role] = [];
    }
    jsonData.byRole[user.role].push(user);
  });

  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf8');
  console.log(`✅ JSON file generated: ${jsonPath}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTE
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n⚠️  WARNING: This will reset ALL user passwords!\n');
  console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');

  // Wait 3 seconds before proceeding
  await new Promise(resolve => setTimeout(resolve, 3000));

  await resetPasswordsAndListUsers();
}

main();
