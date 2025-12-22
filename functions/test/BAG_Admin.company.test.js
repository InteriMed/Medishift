async function testBAGAdminCompanyDirect() {
  console.log('Testing BAG Admin Company Search API directly with GLN: 7601001370357\n');

  const glnCompany = '7601001370357';

  const requestBody = {
    name: '',
    companyTypeId: null,
    glnCompany: glnCompany,
    permissionCantonId: null,
    zip: null,
    city: null
  };

  try {
    console.log('Request URL: https://www.healthreg-public.admin.ch/betreg/api/public/company/search');
    console.log('Request Method: POST');
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    console.log('\nMaking request...\n');

    const response = await fetch('https://www.healthreg-public.admin.ch/betreg/api/public/company/search', {
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
        console.log('- GLN Company:', first.glnCompany || 'N/A');
        console.log('- City:', first.city || 'N/A');
        console.log('- Company Type:', first.companyType || 'N/A');
      }
    } else if (result && result.entries) {
      console.log(`\nFound ${result.matchCount || 0} result(s)`);
      if (result.entries && result.entries.length > 0) {
        console.log('\nFirst Result Summary:');
        const first = result.entries[0];
        console.log('- Name:', first.name || 'N/A');
        console.log('- GLN Company:', first.glnCompany || 'N/A');
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
  testBAGAdminCompanyDirect()
    .then(() => {
      console.log('\nTest completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nTest failed with error:', error);
      process.exit(1);
    });
}

module.exports = { testBAGAdminCompanyDirect };



