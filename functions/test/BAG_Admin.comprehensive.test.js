async function testBAGAdminComprehensive() {
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE BAG ADMIN API TEST');
  console.log('='.repeat(80));
  console.log();

  const professionalGLN = '7601001419988';
  const companyGLN = '7601001370357';

  console.log('TEST 1: Healthcare Professional Search');
  console.log('-'.repeat(80));
  console.log(`GLN: ${professionalGLN}\n`);

  try {
    const professionalRequestBody = {
      cetTitleKindIds: null,
      city: null,
      firstName: null,
      genderId: null,
      gln: professionalGLN,
      houseNumber: null,
      languageId: null,
      name: null,
      nationalityId: null,
      permissionCantonId: null,
      privateLawCetTitleKindIds: null,
      professionId: 2,
      professionalPracticeLicenseId: null,
      street: null,
      zip: null
    };

    const professionalResponse = await fetch('https://www.healthreg-public.admin.ch/medreg/api/public/person/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(professionalRequestBody)
    });

    if (professionalResponse.ok) {
      const professionalData = await professionalResponse.json();
      
      console.log('✅ SUCCESS - Professional Data Retrieved');
      console.log('\nFull Response Structure:');
      console.log(JSON.stringify(professionalData, null, 2));
      
      if (professionalData.entries && professionalData.entries.length > 0) {
        const entry = professionalData.entries[0];
        console.log('\n📋 Professional Entry Details:');
        console.log(`  ID: ${entry.id}`);
        console.log(`  Name: ${entry.name}`);
        console.log(`  First Name: ${entry.firstName}`);
        
        if (entry.professions && entry.professions.length > 0) {
          entry.professions.forEach((prof, idx) => {
            console.log(`\n  Profession ${idx + 1}:`);
            if (prof.profession) {
              console.log(`    - ID: ${prof.profession.id}`);
              console.log(`    - German: ${prof.profession.textDe}`);
              console.log(`    - French: ${prof.profession.textFr}`);
              console.log(`    - Italian: ${prof.profession.textIt}`);
              console.log(`    - English: ${prof.profession.textEn}`);
              console.log(`    - Active: ${prof.profession.isActive}`);
            }
            if (prof.cetTitles && prof.cetTitles.length > 0) {
              console.log(`    - CET Titles: ${JSON.stringify(prof.cetTitles)}`);
            } else {
              console.log(`    - CET Titles: None`);
            }
            if (prof.cantons && prof.cantons.length > 0) {
              console.log(`    - Cantons: ${JSON.stringify(prof.cantons)}`);
            } else {
              console.log(`    - Cantons: None`);
            }
          });
        }
        
        console.log('\n  All Available Fields:');
        console.log(JSON.stringify(Object.keys(entry), null, 2));
      }
      
      console.log(`\n  Match Count: ${professionalData.matchCount}`);
      console.log(`  Max Result Count: ${professionalData.maxResultCount}`);
      console.log(`  Too Many Results: ${professionalData.tooManyResults}`);
    } else {
      console.log(`❌ ERROR: Status ${professionalResponse.status}`);
      const errorText = await professionalResponse.text();
      console.log('Error:', errorText);
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }

  console.log('\n\n');
  console.log('TEST 2: Healthcare Company Search');
  console.log('-'.repeat(80));
  console.log(`GLN: ${companyGLN}\n`);

  try {
    const companyRequestBody = {
      name: '',
      companyTypeId: null,
      glnCompany: companyGLN,
      permissionCantonId: null,
      zip: null,
      city: null
    };

    const companyResponse = await fetch('https://www.healthreg-public.admin.ch/betreg/api/public/company/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(companyRequestBody)
    });

    if (companyResponse.ok) {
      const companyData = await companyResponse.json();
      
      console.log('✅ SUCCESS - Company Data Retrieved');
      console.log('\nFull Response Structure:');
      console.log(JSON.stringify(companyData, null, 2));
      
      if (companyData.entries && companyData.entries.length > 0) {
        const entry = companyData.entries[0];
        console.log('\n📋 Company Entry Details:');
        console.log(`  ID: ${entry.id}`);
        console.log(`  Name: ${entry.name}`);
        console.log(`  Additional Name: ${entry.additionalName || 'None'}`);
        console.log(`  City: ${entry.city}`);
        console.log(`  GLN Company: ${entry.glnCompany}`);
        
        console.log('\n  All Available Fields:');
        console.log(JSON.stringify(Object.keys(entry), null, 2));
        
        console.log('\n  Complete Entry Data:');
        console.log(JSON.stringify(entry, null, 2));
      }
      
      console.log(`\n  Match Count: ${companyData.matchCount}`);
      console.log(`  Max Result Count: ${companyData.maxResultCount}`);
      console.log(`  Too Many Results: ${companyData.tooManyResults}`);
    } else {
      console.log(`❌ ERROR: Status ${companyResponse.status}`);
      const errorText = await companyResponse.text();
      console.log('Error:', errorText);
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }

  console.log('\n');
  console.log('='.repeat(80));
  console.log('TEST COMPLETED');
  console.log('='.repeat(80));
}

if (require.main === module) {
  testBAGAdminComprehensive()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed with error:', error);
      process.exit(1);
    });
}

module.exports = { testBAGAdminComprehensive };



