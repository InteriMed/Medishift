async function testBAGAdminDirect() {
  console.log('Testing BAG Admin API directly with GLN: 7601001419988\n');

  const gln = '7601001419988';

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
    console.log('\nRetrieved Data:');
    console.log(JSON.stringify(result, null, 2));

    if (result && Array.isArray(result)) {
      console.log(`\nFound ${result.length} result(s)`);
      if (result.length > 0) {
        console.log('\nFirst Result Summary:');
        const first = result[0];
        console.log('- Name:', first.name || 'N/A');
        console.log('- First Name:', first.firstName || 'N/A');
        console.log('- GLN:', first.gln || 'N/A');
        console.log('- City:', first.city || 'N/A');
      }
    }
  } catch (error) {
    console.log('\n❌ ERROR');
    console.log('Error Message:', error.message);
    console.log('Error Stack:', error.stack);
  }
}

if (require.main === module) {
  testBAGAdminDirect()
    .then(() => {
      console.log('\nTest completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nTest failed with error:', error);
      process.exit(1);
    });
}

module.exports = { testBAGAdminDirect };



