async function testBAGAdminCompanyDetails() {
  console.log('='.repeat(80));
  console.log('BAG ADMIN COMPANY DETAILS TEST');
  console.log('='.repeat(80));
  console.log();

  const companyGLN = '7601001370357';
  let companyId = null;

  console.log('STEP 1: Search for company by GLN');
  console.log('-'.repeat(80));
  console.log(`GLN: ${companyGLN}\n`);

  try {
    const searchRequestBody = {
      name: '',
      companyTypeId: null,
      glnCompany: companyGLN,
      permissionCantonId: null,
      zip: null,
      city: null
    };

    console.log('Making search request...');
    const searchResponse = await fetch('https://www.healthreg-public.admin.ch/betreg/api/public/company/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchRequestBody)
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.log(`❌ ERROR: Search failed with status ${searchResponse.status}`);
      console.log('Error Response:', errorText);
      return;
    }

    const searchData = await searchResponse.json();
    console.log('✅ Search successful\n');

    if (searchData.entries && searchData.entries.length > 0) {
      companyId = searchData.entries[0].id;
      console.log('📋 Search Results:');
      console.log(`  Found ${searchData.entries.length} company(ies)`);
      console.log(`  Company ID: ${companyId}`);
      console.log(`  Company Name: ${searchData.entries[0].name}`);
      console.log(`  City: ${searchData.entries[0].city}`);
      console.log(`  GLN: ${searchData.entries[0].glnCompany}`);
    } else {
      console.log('⚠️  No companies found for this GLN');
      return;
    }
  } catch (error) {
    console.log('❌ ERROR in search:', error.message);
    return;
  }

  if (!companyId) {
    console.log('❌ Cannot proceed - no company ID found');
    return;
  }

  console.log('\n\n');
  console.log('STEP 2: Get detailed company information by ID');
  console.log('-'.repeat(80));
  console.log(`Company ID: ${companyId}\n`);

  try {
    const detailsUrl = `https://www.healthreg-public.admin.ch/betreg/api/public/company/${companyId}`;
    console.log(`Request URL: ${detailsUrl}`);
    console.log('Request Method: GET\n');
    console.log('Making details request...\n');

    const detailsResponse = await fetch(detailsUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    console.log('Response Status:', detailsResponse.status, detailsResponse.statusText);
    console.log('Response Headers:', Object.fromEntries(detailsResponse.headers.entries()));

    if (!detailsResponse.ok) {
      const errorText = await detailsResponse.text();
      console.log('\n❌ ERROR: Details request failed');
      console.log('Error Response:', errorText);
      return;
    }

    const detailsData = await detailsResponse.json();

    console.log('\n✅ SUCCESS - Company Details Retrieved');
    console.log('\nFull Response:');
    console.log(JSON.stringify(detailsData, null, 2));

    console.log('\n📋 Company Details Summary:');
    if (detailsData.id) console.log(`  ID: ${detailsData.id}`);
    if (detailsData.name) console.log(`  Name: ${detailsData.name}`);
    if (detailsData.additionalName) console.log(`  Additional Name: ${detailsData.additionalName}`);
    if (detailsData.city) console.log(`  City: ${detailsData.city}`);
    if (detailsData.zip) console.log(`  ZIP: ${detailsData.zip}`);
    if (detailsData.street) console.log(`  Street: ${detailsData.street}`);
    if (detailsData.houseNumber) console.log(`  House Number: ${detailsData.houseNumber}`);
    if (detailsData.glnCompany) console.log(`  GLN Company: ${detailsData.glnCompany}`);
    if (detailsData.companyType) {
      console.log(`  Company Type: ${detailsData.companyType.textDe || detailsData.companyType.textFr || 'N/A'}`);
    }
    if (detailsData.phone) console.log(`  Phone: ${detailsData.phone}`);
    if (detailsData.email) console.log(`  Email: ${detailsData.email}`);
    if (detailsData.website) console.log(`  Website: ${detailsData.website}`);

    console.log('\n  All Available Fields:');
    console.log(JSON.stringify(Object.keys(detailsData), null, 2));

  } catch (error) {
    console.log('\n❌ ERROR in details request:', error.message);
    console.log('Error Stack:', error.stack);
  }

  console.log('\n');
  console.log('='.repeat(80));
  console.log('TEST COMPLETED');
  console.log('='.repeat(80));
}

if (require.main === module) {
  testBAGAdminCompanyDetails()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed with error:', error);
      process.exit(1);
    });
}

module.exports = { testBAGAdminCompanyDetails };



