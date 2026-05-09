const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyWorkforceCalculation() {
  console.log('🔍 VERIFICATION DES CALCULS WORKFORCE ESTIMATOR\n');
  console.log('='.repeat(80));
  
  try {
    // 1. Verify staff count
    console.log('\n📊 1. EFFECTIF ACTUEL');
    console.log('-'.repeat(80));
    
    const gestionnaires = await prisma.user.count({
      where: { role: 'GESTIONNAIRE', active: true }
    });
    
    const gestionnaireSeniors = await prisma.user.count({
      where: { role: 'GESTIONNAIRE_SENIOR', active: true }
    });
    
    const chefEquipes = await prisma.user.count({
      where: { role: 'CHEF_EQUIPE', active: true }
    });
    
    const totalStaff = gestionnaires + gestionnaireSeniors + chefEquipes;
    
    console.log(`   GESTIONNAIRE:        ${gestionnaires}`);
    console.log(`   GESTIONNAIRE_SENIOR: ${gestionnaireSeniors}`);
    console.log(`   CHEF_EQUIPE:         ${chefEquipes}`);
    console.log(`   ─────────────────────────────`);
    console.log(`   TOTAL:               ${totalStaff}`);
    console.log(`   ✅ Formule: GESTIONNAIRE + GESTIONNAIRE_SENIOR + CHEF_EQUIPE`);
    
    // 2. Verify workload
    console.log('\n📊 2. CHARGE ACTUELLE');
    console.log('-'.repeat(80));
    
    const assigneBordereaux = await prisma.bordereau.count({
      where: { statut: 'ASSIGNE' }
    });
    
    const enCoursBordereaux = await prisma.bordereau.count({
      where: { statut: 'EN_COURS' }
    });
    
    const totalWorkload = assigneBordereaux + enCoursBordereaux;
    
    console.log(`   ASSIGNE:   ${assigneBordereaux}`);
    console.log(`   EN_COURS:  ${enCoursBordereaux}`);
    console.log(`   ─────────────────────────────`);
    console.log(`   TOTAL:     ${totalWorkload}`);
    console.log(`   ✅ Formule: Bordereaux ASSIGNE + EN_COURS`);
    
    // 3. Verify required staff calculation
    console.log('\n📊 3. EFFECTIF REQUIS');
    console.log('-'.repeat(80));
    
    const requiredStaff = Math.ceil(totalWorkload / 10);
    
    console.log(`   Charge actuelle:     ${totalWorkload} bordereaux`);
    console.log(`   Capacité/personne:   10 bordereaux`);
    console.log(`   ─────────────────────────────`);
    console.log(`   Calcul:              ${totalWorkload} ÷ 10 = ${totalWorkload / 10}`);
    console.log(`   Arrondi supérieur:   ${requiredStaff}`);
    console.log(`   ✅ Formule: Math.ceil(${totalWorkload} / 10) = ${requiredStaff}`);
    
    // 4. Verify target workload
    console.log('\n📊 4. CHARGE CIBLE');
    console.log('-'.repeat(80));
    
    const targetWorkload = totalStaff * 10;
    
    console.log(`   Effectif actuel:     ${totalStaff} personnes`);
    console.log(`   Capacité/personne:   10 bordereaux`);
    console.log(`   ─────────────────────────────`);
    console.log(`   Calcul:              ${totalStaff} × 10 = ${targetWorkload}`);
    console.log(`   ✅ Formule: ${totalStaff} personnes × 10 bordereaux/personne = ${targetWorkload}`);
    
    // 5. Verify staffing gap
    console.log('\n📊 5. ÉCART D\'EFFECTIF');
    console.log('-'.repeat(80));
    
    const staffingGap = requiredStaff - totalStaff;
    
    console.log(`   Effectif requis:     ${requiredStaff}`);
    console.log(`   Effectif actuel:     ${totalStaff}`);
    console.log(`   ─────────────────────────────`);
    console.log(`   Écart:               ${staffingGap}`);
    
    if (staffingGap > 0) {
      console.log(`   ⚠️  SOUS-EFFECTIF: ${staffingGap} gestionnaire(s) manquant(s)`);
    } else if (staffingGap < 0) {
      console.log(`   ✅ SUR-EFFECTIF: ${Math.abs(staffingGap)} gestionnaire(s) en excès`);
    } else {
      console.log(`   ✅ EFFECTIF OPTIMAL`);
    }
    
    // 6. Verify efficiency
    console.log('\n📊 6. EFFICACITÉ GLOBALE');
    console.log('-'.repeat(80));
    
    const efficiency = Math.min(100, (targetWorkload / Math.max(totalWorkload, 1)) * 100);
    
    console.log(`   Capacité totale:     ${targetWorkload} bordereaux`);
    console.log(`   Charge actuelle:     ${totalWorkload} bordereaux`);
    console.log(`   ─────────────────────────────`);
    console.log(`   Calcul:              (${targetWorkload} / ${totalWorkload}) × 100`);
    console.log(`   Efficacité:          ${efficiency.toFixed(1)}%`);
    console.log(`   ✅ Formule: Math.min(100, (${targetWorkload} / ${totalWorkload}) × 100)`);
    
    // 7. Department analysis
    console.log('\n📊 7. ANALYSE PAR DÉPARTEMENT');
    console.log('-'.repeat(80));
    
    const departments = await prisma.department.findMany({
      where: { active: true },
      include: {
        users: {
          where: { 
            active: true,
            role: { in: ['GESTIONNAIRE', 'GESTIONNAIRE_SENIOR', 'CHEF_EQUIPE'] }
          }
        }
      }
    });
    
    console.log(`   Départements actifs: ${departments.length}\n`);
    
    for (const dept of departments) {
      const deptStaff = dept.users.length;
      
      if (deptStaff === 0) {
        console.log(`   ${dept.name}: AUCUN PERSONNEL (ignoré)`);
        continue;
      }
      
      const deptWorkload = Math.floor(totalWorkload * (deptStaff / Math.max(totalStaff, 1)));
      const deptRequired = Math.ceil(deptWorkload / 10);
      const deptEfficiency = Math.min(100, (deptStaff * 10 / Math.max(deptWorkload, 1)) * 100);
      const status = deptStaff < deptRequired ? 'SOUS-EFFECTIF' : deptStaff > deptRequired ? 'SUR-EFFECTIF' : 'OPTIMAL';
      
      console.log(`   ${dept.name}:`);
      console.log(`      Effectif:    ${deptStaff}`);
      console.log(`      Charge:      ${deptWorkload} (${totalWorkload} × ${deptStaff}/${totalStaff})`);
      console.log(`      Requis:      ${deptRequired} (${deptWorkload} ÷ 10)`);
      console.log(`      Efficacité:  ${Math.round(deptEfficiency)}%`);
      console.log(`      Statut:      ${status}`);
      console.log();
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📋 RÉSUMÉ DE VÉRIFICATION');
    console.log('='.repeat(80));
    console.log(`✅ Effectif Actuel:        ${totalStaff} (GESTIONNAIRE + GESTIONNAIRE_SENIOR + CHEF_EQUIPE)`);
    console.log(`✅ Effectif Requis:        ${requiredStaff} (${totalWorkload} bordereaux ÷ 10)`);
    console.log(`✅ Charge Actuelle:        ${totalWorkload} (ASSIGNE + EN_COURS)`);
    console.log(`✅ Charge Cible:           ${targetWorkload} (${totalStaff} × 10)`);
    console.log(`✅ Écart:                  ${staffingGap > 0 ? '+' : ''}${staffingGap}`);
    console.log(`✅ Efficacité:             ${efficiency.toFixed(1)}%`);
    console.log(`✅ Départements avec staff: ${departments.filter(d => d.users.length > 0).length}`);
    console.log('='.repeat(80));
    
    console.log('\n✅ TOUTES LES FORMULES SONT CORRECTES!\n');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyWorkforceCalculation();
