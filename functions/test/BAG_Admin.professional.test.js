async function testBAGAdminProfessional() {
  console.log('Testing BAG Admin Professional Search API with GLN: 7601001419827\n');

  const gln = '7601001419827';

  const requestBody = {
    cetTitleKindIds: null,
    city: null,
    firstName: null,
    genderId: null,
    gln: gln,
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

  try {
    console.log('Request URL: https://www.healthreg-public.admin.ch/medreg/api/public/person/search');
    console.log('Request Method: POST');
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    console.log('\nMaking request...\n');

    const response = await fetch('https://www.healthreg-public.admin.ch/medreg/api/public/person/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response Status:', response.status, response.statusText);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.log('\n❌ ERROR: Response not OK');
      console.log('Error Response:', errorText);
      return;
    }

    const result = await response.json();

    console.log('\n✅ SUCCESS!');
    console.log('\nFull Response:');
    console.log(JSON.stringify(result, null, 2));

    if (result && result.entries) {
      console.log(`\n📊 Summary:`);
      console.log(`  Match Count: ${result.matchCount}`);
      console.log(`  Max Result Count: ${result.maxResultCount}`);
      console.log(`  Too Many Results: ${result.tooManyResults}`);
      console.log(`  Entries Found: ${result.entries.length}`);

      if (result.entries.length > 0) {
        result.entries.forEach((entry, index) => {
          console.log(`\n  📋 Entry ${index + 1}:`);
          console.log(`    ID: ${entry.id}`);
          console.log(`    Name: ${entry.name}`);
          console.log(`    First Name: ${entry.firstName || 'N/A'}`);
          
          if (entry.professions && entry.professions.length > 0) {
            console.log(`    Professions: ${entry.professions.length}`);
            entry.professions.forEach((prof, idx) => {
              if (prof.profession) {
                console.log(`      Profession ${idx + 1}:`);
                console.log(`        - ID: ${prof.profession.id}`);
                console.log(`        - German: ${prof.profession.textDe}`);
                console.log(`        - French: ${prof.profession.textFr}`);
                console.log(`        - Italian: ${prof.profession.textIt}`);
                console.log(`        - English: ${prof.profession.textEn}`);
                console.log(`        - Active: ${prof.profession.isActive}`);
              }
              if (prof.cetTitles && prof.cetTitles.length > 0) {
                console.log(`        - CET Titles: ${JSON.stringify(prof.cetTitles)}`);
              }
              if (prof.cantons && prof.cantons.length > 0) {
                console.log(`        - Cantons: ${JSON.stringify(prof.cantons)}`);
              }
            });
          }

          console.log(`\n    All Fields: ${Object.keys(entry).join(', ')}`);
        });
      } else {
        console.log('\n  ⚠️  No entries found for this GLN');
      }
    }
  } catch (error) {
    console.log('\n❌ ERROR');
    console.log('Error Message:', error.message);
    console.log('Error Stack:', error.stack);
  }
}

if (require.main === module) {
  testBAGAdminProfessional()
    .then(() => {
      console.log('\nTest completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nTest failed with error:', error);
      process.exit(1);
    });
}

module.exports = { testBAGAdminProfessional };



