arsadmin@arshosting:/home/yourapp/server$ cp /home/yourapp/server/src/bordereaux/chef-equipe-tableau-bord.controller.ts /home/yourapp/server/src/bordereaux/chef-equipe-tableau-bord.controller.ts.backup
arsadmin@arshosting:/home/yourapp/server$ ^C
arsadmin@arshosting:/home/yourapp/server$ grep -n "private async findFileInUploads" /home/yourapp/server/src/bordereaux/chef-equipe-tableau-bord.controller.ts
1058:  private async findFileInUploads(filename: string): Promise<string | null> {
arsadmin@arshosting:/home/yourapp/server$ ^C
arsadmin@arshosting:/home/yourapp/server$ cat > /tmp/fix_find_file.txt << 'EOF'
  private async findFileInUploads(filename: string): Promise<string | null> {
    // Search in BOTH upload directories (old and new)
    const uploadsDirs = [
      path.join(process.cwd(), 'uploads'),           // New: /home/yourapp/server/uploads
      '/home/yourapp/uploads'                         // Old: /home/yourapp/uploads
    ];

    const searchInDirectory = (dir: string): string | null => {
      if (!fs.existsSync(dir)) return null;

      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });

        for (const item of items) {
          if (item.isFile() && (item.name === filename || item.name.endsWith('_' + filename))) {
            return path.join(dir, item.name);
          }
        }

        for (const item of items) {
          if (item.isDirectory()) {
            const found = searchInDirectory(path.join(dir, item.name));
            if (found) return found;
          }
        }
      } catch (error) {
        // console.log(`Error reading directory ${dir}:`, error.message);
      }

      return null;
    };

    // Try each uploads directory
    for (const uploadsDir of uploadsDirs) {
      const result = searchInDirectory(uploadsDir);
      if (result) return result;
    }

    return null;
  }
EOF
arsadmin@arshosting:/home/yourapp/server$ sed -i '1058,1085d' /home/yourapp/server/src/bordereaux/chef-equipe-tableau-bord.controller.ts
arsadmin@arshosting:/home/yourapp/server$ sed -i '1057r /tmp/fix_find_file.txt' /home/yourapp/server/src/bordereaux/chef-equipe-tableau-bord.controller.ts
arsadmin@arshosting:/home/yourapp/server$ echo "✅ Modified function:"
✅ Modified function:
arsadmin@arshosting:/home/yourapp/server$ grep -A 35 "private async findFileInUploads" /home/yourapp/server/src/bordereaux/chef-equipe-tableau-bord.controller.ts
  private async findFileInUploads(filename: string): Promise<string | null> {
    // Search in BOTH upload directories (old and new)
    const uploadsDirs = [
      path.join(process.cwd(), 'uploads'),           // New: /home/yourapp/server/uploads
      '/home/yourapp/uploads'                         // Old: /home/yourapp/uploads
    ];

    const searchInDirectory = (dir: string): string | null => {
      if (!fs.existsSync(dir)) return null;

      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });

        for (const item of items) {
          if (item.isFile() && (item.name === filename || item.name.endsWith('_' + filename))) {
            return path.join(dir, item.name);
          }
        }

        for (const item of items) {
          if (item.isDirectory()) {
            const found = searchInDirectory(path.join(dir, item.name));
            if (found) return found;
          }
        }
      } catch (error) {
        // console.log(`Error reading directory ${dir}:`, error.message);
      }

      return null;
    };

    // Try each uploads directory
    for (const uploadsDir of uploadsDirs) {
      const result = searchInDirectory(uploadsDir);
      if (result) return result;
arsadmin@arshosting:/home/yourapp/server$
-------------------------------------
arsadmin@arshosting:/home/yourapp/server$ cp /home/yourapp/server/src/bordereaux/chef-equipe-tableau-bord.controller.ts.backup /home/yourapp/server/src/bordereaux/chef-equipe-tableau-bord.controller.ts
arsadmin@arshosting:/home/yourapp/server$ echo "✅ File restored, now applying proper fix..."
✅ File restored, now applying proper fix...
arsadmin@arshosting:/home/yourapp/server$ sed -i '/private async findFileInUploads(filename: string): Promise<string | null> {/,/return searchInDirectory(uploadsDir);/c\
  private async findFileInUploads(filename: string): Promise<string | null> {\
    \/\/ Search in BOTH upload directories (old and new)\
    const uploadsDirs = [\
      path.join(process.cwd(), '\''uploads'\''),           \/\/ New: \/home\/yourapp\/server\/uploads\
      '\''\/home\/yourapp\/uploads'\''                         \/\/ Old: \/home\/yourapp\/uploads\
    ];\
\
    const searchInDirectory = (dir: string): string | null => {\
      if (!fs.existsSync(dir)) return null;\
\
      try {\
        const items = fs.readdirSync(dir, { withFileTypes: true });\
\
        for (const item of items) {\
          if (item.isFile() && (item.name === filename || item.name.endsWith('\''_'\'' + filename))) {\
            return path.join(dir, item.name);\
          }\
        }\
\
        for (const item of items) {\
          if (item.isDirectory()) {\
            const found = searchInDirectory(path.join(dir, item.name));\
            if (found) return found;\
          }\
        }\
      } catch (error) {\
        \/\/ console.log(\`Error reading directory ${dir}:\`, error.message);\
      }\
\
      return null;\
    };\
\
    \/\/ Try each uploads directory\
    for (const uploadsDir of uploadsDirs) {\
      const result = searchInDirectory(uploadsDir);\
      if (result) return result;\
    }\
\
    return null;' /home/yourapp/server/src/bordereaux/chef-equipe-tableau-bord.controller.ts
arsadmin@arshosting:/home/yourapp/server$ grep -A 40 "private async findFileInUploads" /home/yourapp/server/src/bordereaux/chef-equipe-tableau-bord.controller.ts | head -45
  private async findFileInUploads(filename: string): Promise<string | null> {
    // Search in BOTH upload directories (old and new)
    const uploadsDirs = [
      path.join(process.cwd(), 'uploads'),           // New: /home/yourapp/server/uploads
      '/home/yourapp/uploads'                         // Old: /home/yourapp/uploads
    ];

    const searchInDirectory = (dir: string): string | null => {
      if (!fs.existsSync(dir)) return null;

      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });

        for (const item of items) {
          if (item.isFile() && (item.name === filename || item.name.endsWith('_' + filename))) {
            return path.join(dir, item.name);
          }
        }

        for (const item of items) {
          if (item.isDirectory()) {
            const found = searchInDirectory(path.join(dir, item.name));
            if (found) return found;
          }
        }
      } catch (error) {
        // console.log(`Error reading directory ${dir}:`, error.message);
      }

      return null;
    };

    // Try each uploads directory
    for (const uploadsDir of uploadsDirs) {
      const result = searchInDirectory(uploadsDir);
      if (result) return result;
    }

    return null;
  }

arsadmin@arshosting:/home/yourapp/server$
