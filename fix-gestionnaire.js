const fs = require('fs');

const filePath = 'D:\\ARS\\frontend\\src\\pages\\bordereaux\\BordereauxDashboard.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the gestionnaire logic
const oldLogic = `                            // Check for Gestionnaire Senior first (priority)

                            if (bordereau.contract?.assignedManager) {
                              return (
                                <span style={{ 
                                  background: '#e8f5e9', 
                                  color: '#2e7d32',

                                  padding: '4px 8px', 
                                  borderRadius: '12px', 
                                  fontSize: '11px', 
                                  fontWeight: 'bold',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>

                                  👨💼 {bordereau.contract.assignedManager.fullName}

                                </span>
                              );
                            }

                            // Then check for regular Gestionnaire`;

const newLogic = `                            // Priority 1: Check contract.assignedManager (Gestionnaire Senior OR regular Gestionnaire)
                            if (bordereau.contract?.assignedManager) {
                              const manager = bordereau.contract.assignedManager;
                              const isSenior = manager.role === 'GESTIONNAIRE_SENIOR';
                              const icon = isSenior ? '👨💼' : '👤';
                              const bgColor = isSenior ? '#e8f5e9' : '#e3f2fd';
                              const textColor = isSenior ? '#2e7d32' : '#1976d2';
                              return (
                                <span style={{ 
                                  background: bgColor, 
                                  color: textColor, 
                                  padding: '4px 8px', 
                                  borderRadius: '12px', 
                                  fontSize: '11px', 
                                  fontWeight: 'bold',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  {icon} {manager.fullName}
                                </span>
                              );
                            }
                            // Priority 2: Check currentHandler (only if GESTIONNAIRE or GESTIONNAIRE_SENIOR)`;

content = content.replace(oldLogic, newLogic);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fixed gestionnaire column logic!');
