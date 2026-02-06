// Test script to check faculty API response
// Run this in browser console on the faculty edit page

async function testFacultyAPI() {
  const facultyId = 230; // Change this to the faculty ID you're testing
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  
  if (!token) {
    console.error('No token found. Please login first.');
    return;
  }
  
  try {
    const response = await fetch(`https://api.prashantthakar.com/api/users/${facultyId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('=== FULL API RESPONSE ===');
    console.log(JSON.stringify(data, null, 2));
    
    const user = data?.data?.user;
    const profile = user?.facultyProfile;
    
    console.log('\n=== USER DATA ===');
    console.log('User ID:', user?.id);
    console.log('User Name:', user?.name);
    console.log('User Email:', user?.email);
    
    console.log('\n=== FACULTY PROFILE ===');
    console.log('Has Profile:', !!profile);
    console.log('Profile ID:', profile?.id);
    console.log('Profile UserId:', profile?.userId);
    
    console.log('\n=== DOCUMENTS FIELD ===');
    console.log('Has Documents:', !!profile?.documents);
    console.log('Documents Type:', typeof profile?.documents);
    
    if (profile?.documents) {
      if (typeof profile.documents === 'string') {
        console.log('⚠️ DOCUMENTS IS A STRING (needs parsing)');
        try {
          const parsed = JSON.parse(profile.documents);
          console.log('Parsed Documents:', parsed);
          console.log('Personal Info:', parsed.personalInfo);
          console.log('Employment Info:', parsed.employmentInfo);
          console.log('Bank Info:', parsed.bankInfo);
          console.log('Emergency Info:', parsed.emergencyInfo);
        } catch (e) {
          console.error('Failed to parse documents:', e);
        }
      } else {
        console.log('✅ DOCUMENTS IS AN OBJECT');
        console.log('Documents:', profile.documents);
        console.log('Personal Info:', profile.documents.personalInfo);
        console.log('Employment Info:', profile.documents.employmentInfo);
        console.log('Bank Info:', profile.documents.bankInfo);
        console.log('Emergency Info:', profile.documents.emergencyInfo);
      }
    } else {
      console.log('❌ NO DOCUMENTS FIELD');
    }
    
    console.log('\n=== EXPERTISE ===');
    console.log('Has Expertise:', !!profile?.expertise);
    console.log('Expertise Type:', typeof profile?.expertise);
    console.log('Expertise Value:', profile?.expertise);
    
    console.log('\n=== AVAILABILITY ===');
    console.log('Has Availability:', !!profile?.availability);
    console.log('Availability Type:', typeof profile?.availability);
    console.log('Availability Value:', profile?.availability);
    
    console.log('\n=== DATE OF BIRTH ===');
    console.log('Date of Birth:', profile?.dateOfBirth);
    
    // Check if data exists
    if (!profile) {
      console.error('\n❌ ERROR: No faculty profile found!');
    } else if (!profile.documents) {
      console.error('\n❌ ERROR: No documents field in profile!');
    } else if (typeof profile.documents === 'string') {
      console.error('\n⚠️ WARNING: Documents is a string. Backend should parse it to object.');
    } else {
      console.log('\n✅ SUCCESS: Profile data structure looks correct!');
    }
    
  } catch (error) {
    console.error('Error fetching faculty data:', error);
  }
}

// Run the test
testFacultyAPI();

