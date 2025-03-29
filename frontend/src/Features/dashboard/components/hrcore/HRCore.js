import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HRCore.css';
import API_CONFIG from '../../../../config/api.config';
import EventPanel from '../calendar/components/event_panel/Event_Panel';
import logo from '../../../../assets/global/logo.png';

const HRCore = () => {
  const [contracts, setContracts] = useState([]);
  const [scheduleItems, setScheduleItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('contracts'); // Changed to contracts as default
  const [selectedItem, setSelectedItem] = useState(null);
  const [sortOption, setSortOption] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const userId = 'ZgSMcv5jd9Mhjo4A68ZZK0Puabw2'; // Hardcoded user ID for now
  const [showEventPanel, setShowEventPanel] = useState(false);
  const [eventPanelPosition, setEventPanelPosition] = useState({ x: 0, y: 0 });
  const [newEvent, setNewEvent] = useState(null);
  const navigate = useNavigate(); // For navigation to Calendar
  
  // Add new state hooks at the component level
  const [editingSections, setEditingSections] = useState({
    personal: false,
    contact: false,
    languages: false,
    skills: false,
    experiences: false,
    education: false,
    volunteering: false
  });
  
  // State for active filter pills
  const [activeFilters, setActiveFilters] = useState({
    pendingPharmacist: false,
    pendingSignature: false,
    validated: false,
    pastContracts: false
  });
  
  const [editingBanking, setEditingBanking] = useState(false);

  const userProfile = {
    name: "John Smith",
    gender: "Male",
    city: "Zurich",
    email: "john.smith@pharmasoft.com",
    phone: "+41 79 123 45 67",
    address: "Bahnhofstrasse 10, 8001 Zurich",
  };

  // Color options for the event panel
  const colorOptions = [
    { id: 1, color: '#ff453a', color1: '#ff453a55', color2: '#ff453a' },
    { id: 2, color: '#ff9f0a', color1: '#ff9f0a55', color2: '#ff9f0a' },
    { id: 3, color: '#32d74b', color1: '#32d74b55', color2: '#32d74b' },
    { id: 4, color: '#0a84ff', color1: '#0a84ff55', color2: '#0a84ff' },
    { id: 5, color: '#bf5af2', color1: '#bf5af255', color2: '#bf5af2' }
  ];

  // Toggle filter pill state
  const toggleFilter = (filter) => {
    setActiveFilters({
      ...activeFilters,
      [filter]: !activeFilters[filter]
    });
  };

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        // Mock contracts data
        const mockContracts = [
          {
            id: 'contract1',
            title: 'Pharmacy Assistant Contract',
            companyName: 'MedPharm Ltd',
            date: '2024-04-15',
            description: 'Contract for part-time pharmacy assistant position',
            location: 'Zurich',
            contractDetails: {
              startDate: '2024-05-01',
              endDate: '2024-07-31',
              value: '3500'
            }
          },
          {
            id: 'contract2',
            title: 'Pharmacist Contract',
            companyName: 'HealthPlus',
            date: '2024-03-22',
            description: 'Full-time pharmacist position in downtown location',
            location: 'Geneva',
            contractDetails: {
              startDate: '2024-04-15',
              endDate: '2025-04-14',
              value: '85000'
            }
          },
          {
            id: 'contract3',
            title: 'Temp Pharmaceutical Technician',
            companyName: 'Swiss Medical Center',
            date: '2024-03-10',
            description: 'Temporary position covering maternity leave',
            location: 'Basel',
            contractDetails: {
              startDate: '2024-04-01',
              endDate: '2024-10-31',
              value: '4200'
            }
          }
        ];
        
        // Mock schedule data
        const mockSchedule = [
          {
            id: 'schedule1',
            title: 'Morning Shift',
            companyName: 'MedPharm Ltd',
            date: '2024-04-18',
            description: 'Regular morning shift at downtown location',
            location: 'Zurich, Main St',
            scheduleDetails: {
              time: '08:00 - 14:00',
              duration: '6 hours',
              participants: ['Dr. Smith', 'Jane Doe']
            }
          },
          {
            id: 'schedule2',
            title: 'Evening Shift',
            companyName: 'HealthPlus',
            date: '2024-04-20',
            description: 'Evening shift covering for regular staff',
            location: 'Geneva',
            scheduleDetails: {
              time: '16:00 - 22:00',
              duration: '6 hours',
              participants: ['John Miller', 'Sarah Johnson']
            }
          },
          {
            id: 'schedule3',
            title: 'Training Session',
            companyName: 'Swiss Medical Center',
            date: '2024-04-25',
            description: 'Training on new inventory system',
            location: 'Basel',
            scheduleDetails: {
              time: '10:00 - 13:00',
              duration: '3 hours',
              participants: ['Training Team', 'New Staff', 'Department Heads']
            }
          },
          {
            id: 'schedule4',
            title: 'Staff Meeting',
            companyName: 'HealthPlus',
            date: '2024-04-30',
            description: 'Monthly staff coordination meeting',
            location: 'Geneva',
            scheduleDetails: {
              time: '09:00 - 10:30',
              duration: '1.5 hours',
              participants: ['All Staff', 'Management']
            }
          }
        ];

        // Set the mock data after a short delay to simulate network request
        setTimeout(() => {
          setContracts(mockContracts);
          setScheduleItems(mockSchedule);
          setError(null);
          setIsLoading(false);
        }, 800);
        
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError(error.message || 'Failed to load data. Please try again later.');
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedItem(null);
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
  };

  const handleBackClick = () => {
    setSelectedItem(null);
  };

  const handleSort = (sortBy) => {
    if (sortOption === sortBy) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort column and default to ascending
      setSortOption(sortBy);
      setSortDirection('asc');
    }
  };

  const handleDateFilterChange = (type, value) => {
    if (type === 'from') {
      setFromDate(value);
    } else {
      setToDate(value);
    }
  };

  const clearDateFilter = () => {
    setFromDate('');
    setToDate('');
    // Reset all filter pills
    setActiveFilters({
      pendingPharmacist: false,
      pendingSignature: false,
      validated: false,
      pastContracts: false
    });
  };

  const filterItems = (items) => {
    let filtered = [...items];
    
    // Apply date filter
    if (fromDate) {
      filtered = filtered.filter(item => new Date(item.date) >= new Date(fromDate));
    }
    
    if (toDate) {
      filtered = filtered.filter(item => new Date(item.date) <= new Date(toDate));
    }
    
    return filtered;
  };

  const sortItems = (items) => {
    return [...items].sort((a, b) => {
      let valueA, valueB;
      
      // Determine which field to sort by
      switch(sortOption) {
        case 'company':
          valueA = a.companyName.toLowerCase();
          valueB = b.companyName.toLowerCase();
          break;
        case 'title':
          valueA = a.title.toLowerCase();
          valueB = b.title.toLowerCase();
          break;
        case 'location':
          valueA = a.location.toLowerCase();
          valueB = b.location.toLowerCase();
          break;
        case 'date':
        default:
          valueA = new Date(a.date);
          valueB = new Date(b.date);
          break;
      }
      
      // Sort based on direction
      if (sortDirection === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  };

  const renderSidebar = () => {
    return (
      <div className="sidebar-container">
        <div className="sidebar-header">
          <h2>MENU</h2>
        </div>      
        <div className="hr-sidebar">
          <div 
            className={`sidebar-item ${activeTab === 'contracts' ? 'active' : ''}`}
            onClick={() => handleTabChange('contracts')}
          >
            <i className="fas fa-file-contract"></i>
            Contracts
          </div>
          <div 
            className={`sidebar-item ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => handleTabChange('schedule')}
          >
            <i className="fas fa-calendar-alt"></i>
            Schedule
          </div>
          <div 
            className={`sidebar-item ${activeTab === 'contacts' ? 'active' : ''}`}
            onClick={() => handleTabChange('contacts')}
          >
            <i className="fas fa-address-book"></i>
            Contacts
          </div>
          <div 
            className={`sidebar-item ${activeTab === 'banking' ? 'active' : ''}`}
            onClick={() => handleTabChange('banking')}
          >
            <i className="fas fa-university"></i>
            Billing
          </div>
          <div 
            className={`sidebar-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => handleTabChange('profile')}
          >
            <i className="fas fa-user"></i>
            Profile
          </div>
        </div>
      </div>    
    );
  };

  const renderUserProfile = () => {
    // Sample user data based on Firebase structure
    const userData = {
      name: "John Smith",
      gender: "Male",
      address: "Zurich, Switzerland",
      birthday: "1990-05-12",
      email: "john.smith@pharmasoft.com",
      phone: "+41 79 123 45 67",
      picture_url: "https://example.com/pic.jpg",
      summary_profile: "Experienced pharmacist with expertise in clinical and community pharmacy.",
      languages: {
        English: "Advanced",
        French: "Intermediate",
        German: "Basic",
        Spanish: "Working proficiency"
      },
      skills: [
        "Pharmaceutical Chemistry",
        "Customer Service",
        "Inventory Management",
        "Medication Dispensing"
      ],
      experiences: [
        {
          job_title: "Pharmacist",
          company: "Pharmacy A",
          start_date: "2020-01-01",
          end_date: "2022-01-01",
          details: "Managed inventory and customer consultations."
        },
        {
          job_title: "Pharmacy Technician",
          company: "Pharmacy B",
          start_date: "2018-01-01",
          end_date: "2020-01-01",
          details: "Assisted with prescriptions and customer service."
        }
      ],
      studies: [
        {
          degree: "Master of Pharmacy",
          institution: "University C",
          graduation_year: 2021,
          details: "Specialized in clinical pharmacy."
        },
        {
          degree: "Bachelor of Pharmacy",
          institution: "University B",
          graduation_year: 2019,
          details: "Focused on pharmaceutical chemistry."
        }
      ],
      volunteering: [
        {
          role: "Volunteer Pharmacist",
          organization: "Pharmacy Charity",
          start_date: "2021-01-01",
          end_date: "2021-06-01",
          details: "Provided free consultations and medication to low-income patients."
        }
      ]
    };

    const toggleEditSection = (section) => {
      setEditingSections({
        ...editingSections,
        [section]: !editingSections[section]
      });
    };

    const handleSaveSection = (section) => {
      // Here you would typically save changes to your database
      toggleEditSection(section);
    };

    return (
      <div className="profile-section">
        <div className="section-header-hr-core">
          <h2>User Profile</h2>
          <div className="profile-avatar">
            <img src={userData.picture_url || "https://via.placeholder.com/100"} alt="Profile" />
            <button className="change-avatar-button">Change Photo</button>
          </div>
        </div>
        
        <div className="profile-content">
          <div className="profile-two-columns">
            {/* Personal Information Section */}
            <div className="profile-card">
              <div className="card-header">
                <h3>Personal Information</h3>
                <button 
                  className="edit-button" 
                  onClick={() => toggleEditSection('personal')}
                >
                  {editingSections.personal ? 'Cancel' : 'Edit'}
                </button>
              </div>
              
              <div className="card-content">
                {editingSections.personal ? (
                  <div className="edit-form">
                    <div className="form-group">
                      <label>Name:</label>
                      <input type="text" defaultValue={userData.name} />
                    </div>
                    <div className="form-group">
                      <label>Gender:</label>
                      <select defaultValue={userData.gender}>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Birthday:</label>
                      <input type="date" defaultValue={userData.birthday} />
                    </div>
                    <div className="form-group">
                      <label>Summary:</label>
                      <textarea defaultValue={userData.summary_profile} rows="3"></textarea>
                    </div>
                    <div className="form-actions">
                      <button className="save-button" onClick={() => handleSaveSection('personal')}>Save Changes</button>
                    </div>
                  </div>
                ) : (
                  <div className="view-form">
                    <div className="info-row">
                      <span className="info-label">Name:</span>
                      <span className="info-value">{userData.name}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Gender:</span>
                      <span className="info-value">{userData.gender}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Birthday:</span>
                      <span className="info-value">{userData.birthday}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Summary:</span>
                      <span className="info-value">{userData.summary_profile}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Contact Information Section */}
            <div className="profile-card">
              <div className="card-header">
                <h3>Contact Information</h3>
                <button 
                  className="edit-button" 
                  onClick={() => toggleEditSection('contact')}
                >
                  {editingSections.contact ? 'Cancel' : 'Edit'}
                </button>
              </div>
              
              <div className="card-content">
                {editingSections.contact ? (
                  <div className="edit-form">
                    <div className="form-group">
                      <label>Email:</label>
                      <input type="email" defaultValue={userData.email} />
                    </div>
                    <div className="form-group">
                      <label>Phone:</label>
                      <input type="tel" defaultValue={userData.phone} />
                    </div>
                    <div className="form-group">
                      <label>Address:</label>
                      <input type="text" defaultValue={userData.address} />
                    </div>
                    <div className="form-actions">
                      <button className="save-button" onClick={() => handleSaveSection('contact')}>Save Changes</button>
                    </div>
                  </div>
                ) : (
                  <div className="view-form">
                    <div className="info-row">
                      <span className="info-label">Email:</span>
                      <span className="info-value">{userData.email}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Phone:</span>
                      <span className="info-value">{userData.phone}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Address:</span>
                      <span className="info-value">{userData.address}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Languages Section */}
            <div className="profile-card">
              <div className="card-header">
                <h3>Languages</h3>
                <button 
                  className="edit-button" 
                  onClick={() => toggleEditSection('languages')}
                >
                  {editingSections.languages ? 'Cancel' : 'Edit'}
                </button>
              </div>
              
              <div className="card-content">
                {editingSections.languages ? (
                  <div className="edit-form">
                    {Object.entries(userData.languages).map(([language, level], index) => (
                      <div className="form-group" key={index}>
                        <label>{language}:</label>
                        <select defaultValue={level}>
                          <option value="Basic">Basic</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                          <option value="Working proficiency">Working proficiency</option>
                          <option value="Native">Native</option>
                        </select>
                        <button className="remove-button">Remove</button>
                      </div>
                    ))}
                    <button className="add-button">Add Language</button>
                    <div className="form-actions">
                      <button className="save-button" onClick={() => handleSaveSection('languages')}>Save Changes</button>
                    </div>
                  </div>
                ) : (
                  <div className="view-form">
                    {Object.entries(userData.languages).map(([language, level], index) => (
                      <div className="info-row" key={index}>
                        <span className="info-label">{language}:</span>
                        <span className="info-value">{level}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Skills Section */}
            <div className="profile-card">
              <div className="card-header">
                <h3>Skills</h3>
                <button 
                  className="edit-button" 
                  onClick={() => toggleEditSection('skills')}
                >
                  {editingSections.skills ? 'Cancel' : 'Edit'}
                </button>
              </div>
              
              <div className="card-content">
                {editingSections.skills ? (
                  <div className="edit-form">
                    {userData.skills.map((skill, index) => (
                      <div className="form-group" key={index}>
                        <input type="text" defaultValue={skill} />
                        <button className="remove-button">Remove</button>
                      </div>
                    ))}
                    <button className="add-button">Add Skill</button>
                    <div className="form-actions">
                      <button className="save-button" onClick={() => handleSaveSection('skills')}>Save Changes</button>
                    </div>
                  </div>
                ) : (
                  <div className="view-form skills-list">
                    {userData.skills.map((skill, index) => (
                      <span className="skill-tag" key={index}>{skill}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Work Experience Section */}
            <div className="profile-card">
              <div className="card-header">
                <h3>Work Experience</h3>
                <button 
                  className="edit-button" 
                  onClick={() => toggleEditSection('experiences')}
                >
                  {editingSections.experiences ? 'Cancel' : 'Edit'}
                </button>
              </div>
              
              <div className="card-content">
                {editingSections.experiences ? (
                  <div className="edit-form">
                    {userData.experiences.map((exp, index) => (
                      <div className="experience-edit-item" key={index}>
                        <div className="form-group">
                          <label>Job Title:</label>
                          <input type="text" defaultValue={exp.job_title} />
                        </div>
                        <div className="form-group">
                          <label>Company:</label>
                          <input type="text" defaultValue={exp.company} />
                        </div>
                        <div className="form-row">
                          <div className="form-group half">
                            <label>Start Date:</label>
                            <input type="date" defaultValue={exp.start_date} />
                          </div>
                          <div className="form-group half">
                            <label>End Date:</label>
                            <input type="date" defaultValue={exp.end_date} />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Details:</label>
                          <textarea defaultValue={exp.details} rows="3"></textarea>
                        </div>
                        <button className="remove-button">Remove Experience</button>
                        <hr/>
                      </div>
                    ))}
                    <button className="add-button">Add Experience</button>
                    <div className="form-actions">
                      <button className="save-button" onClick={() => handleSaveSection('experiences')}>Save Changes</button>
                    </div>
                  </div>
                ) : (
                  <div className="view-form">
                    {userData.experiences.map((exp, index) => (
                      <div className="experience-item" key={index}>
                        <h4>{exp.job_title} at {exp.company}</h4>
                        <div className="date-range">
                          {new Date(exp.start_date).toLocaleDateString()} - {new Date(exp.end_date).toLocaleDateString()}
                        </div>
                        <p>{exp.details}</p>
                        {index < userData.experiences.length - 1 && <hr/>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Education Section */}
            <div className="profile-card">
              <div className="card-header">
                <h3>Education</h3>
                <button 
                  className="edit-button" 
                  onClick={() => toggleEditSection('education')}
                >
                  {editingSections.education ? 'Cancel' : 'Edit'}
                </button>
              </div>
              
              <div className="card-content">
                {editingSections.education ? (
                  <div className="edit-form">
                    {userData.studies.map((study, index) => (
                      <div className="education-edit-item" key={index}>
                        <div className="form-group">
                          <label>Degree:</label>
                          <input type="text" defaultValue={study.degree} />
                        </div>
                        <div className="form-group">
                          <label>Institution:</label>
                          <input type="text" defaultValue={study.institution} />
                        </div>
                        <div className="form-group">
                          <label>Graduation Year:</label>
                          <input type="number" defaultValue={study.graduation_year} />
                        </div>
                        <div className="form-group">
                          <label>Details:</label>
                          <textarea defaultValue={study.details} rows="3"></textarea>
                        </div>
                        <button className="remove-button">Remove Education</button>
                        <hr/>
                      </div>
                    ))}
                    <button className="add-button">Add Education</button>
                    <div className="form-actions">
                      <button className="save-button" onClick={() => handleSaveSection('education')}>Save Changes</button>
                    </div>
                  </div>
                ) : (
                  <div className="view-form">
                    {userData.studies.map((study, index) => (
                      <div className="education-item" key={index}>
                        <h4>{study.degree}</h4>
                        <div className="institution">{study.institution}, {study.graduation_year}</div>
                        <p>{study.details}</p>
                        {index < userData.studies.length - 1 && <hr/>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Volunteering Section */}
            <div className="profile-card">
              <div className="card-header">
                <h3>Volunteering</h3>
                <button 
                  className="edit-button" 
                  onClick={() => toggleEditSection('volunteering')}
                >
                  {editingSections.volunteering ? 'Cancel' : 'Edit'}
                </button>
              </div>
              
              <div className="card-content">
                {editingSections.volunteering ? (
                  <div className="edit-form">
                    {userData.volunteering.map((vol, index) => (
                      <div className="volunteering-edit-item" key={index}>
                        <div className="form-group">
                          <label>Role:</label>
                          <input type="text" defaultValue={vol.role} />
                        </div>
                        <div className="form-group">
                          <label>Organization:</label>
                          <input type="text" defaultValue={vol.organization} />
                        </div>
                        <div className="form-row">
                          <div className="form-group half">
                            <label>Start Date:</label>
                            <input type="date" defaultValue={vol.start_date} />
                          </div>
                          <div className="form-group half">
                            <label>End Date:</label>
                            <input type="date" defaultValue={vol.end_date} />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Details:</label>
                          <textarea defaultValue={vol.details} rows="3"></textarea>
                        </div>
                        <button className="remove-button">Remove Volunteering</button>
                        <hr/>
                      </div>
                    ))}
                    <button className="add-button">Add Volunteering</button>
                    <div className="form-actions">
                      <button className="save-button" onClick={() => handleSaveSection('volunteering')}>Save Changes</button>
                    </div>
                  </div>
                ) : (
                  <div className="view-form">
                    {userData.volunteering.map((vol, index) => (
                      <div className="volunteering-item" key={index}>
                        <h4>{vol.role} at {vol.organization}</h4>
                        <div className="date-range">
                          {new Date(vol.start_date).toLocaleDateString()} - {new Date(vol.end_date).toLocaleDateString()}
                        </div>
                        <p>{vol.details}</p>
                        {index < userData.volunteering.length - 1 && <hr/>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBankingInfo = () => {
    // Sample banking data
    const bankingData = {
      accountHolder: "John Smith",
      bankName: "UBS Bank",
      iban: "CH93 0076 2011 6238 5295 7",
      bic: "UBSWCHZH80A",
      accountNumber: "12345-678",
      taxIdNumber: "123.456.789"
    };

    const toggleEditBanking = () => {
      setEditingBanking(!editingBanking);
    };

    const handleSaveBanking = () => {
      // Here you would typically save changes to your database
      setEditingBanking(false);
    };

    return (
      <div className="banking-section">
        <div className="section-header-hr-core">
          <h2>BANKING</h2>
        </div>
        
        <div className="profile-card">
          <div className="card-header">
            <h3>Payment Details</h3>
            <button 
              className="edit-button" 
              onClick={toggleEditBanking}
            >
              {editingBanking ? 'Cancel' : 'Edit'}
            </button>
          </div>
          
          <div className="card-content">
            {editingBanking ? (
              <div className="edit-form">
                <div className="form-group">
                  <label>Account Holder:</label>
                  <input type="text" defaultValue={bankingData.accountHolder} />
                </div>
                <div className="form-group">
                  <label>Bank Name:</label>
                  <input type="text" defaultValue={bankingData.bankName} />
                </div>
                <div className="form-group">
                  <label>IBAN:</label>
                  <input type="text" defaultValue={bankingData.iban} />
                </div>
                <div className="form-group">
                  <label>BIC/SWIFT:</label>
                  <input type="text" defaultValue={bankingData.bic} />
                </div>
                <div className="form-group">
                  <label>Account Number:</label>
                  <input type="text" defaultValue={bankingData.accountNumber} />
                </div>
                <div className="form-group">
                  <label>Tax ID Number:</label>
                  <input type="text" defaultValue={bankingData.taxIdNumber} />
                </div>
                <div className="form-actions">
                  <button className="save-button" onClick={handleSaveBanking}>Save Changes</button>
                </div>
              </div>
            ) : (
              <div className="view-form">
                <div className="info-row">
                  <span className="info-label">Account Holder:</span>
                  <span className="info-value">{bankingData.accountHolder}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Bank Name:</span>
                  <span className="info-value">{bankingData.bankName}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">IBAN:</span>
                  <span className="info-value">{bankingData.iban}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">BIC/SWIFT:</span>
                  <span className="info-value">{bankingData.bic}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Account Number:</span>
                  <span className="info-value">{bankingData.accountNumber}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Tax ID Number:</span>
                  <span className="info-value">{bankingData.taxIdNumber}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="banking-info-note">
          <p>
            <i className="fas fa-info-circle"></i>
            Your banking information is securely stored and only used for payment purposes.
          </p>
        </div>
      </div>
    );
  };

  // Add missing functions for detail view
  const renderDetailView = () => {
    if (!selectedItem) return null;
    
    return (
      <div className="detail-view">
        <div className="detail-header">
          <button className="back-button" onClick={handleBackClick}>← Back</button>
          <h2>{selectedItem.title}</h2>
        </div>
        
        <div className="detail-content">
          <div className="detail-row">
            <span className="detail-label">Company:</span>
            <span className="detail-value">{selectedItem.companyName}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">Date:</span>
            <span className="detail-value">{new Date(selectedItem.date).toLocaleDateString()}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">Location:</span>
            <span className="detail-value">{selectedItem.location}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">Description:</span>
            <span className="detail-value">{selectedItem.description}</span>
          </div>
          
          {selectedItem.contractDetails && (
            <>
              <h3>Contract Details</h3>
              <div className="detail-row">
                <span className="detail-label">Start Date:</span>
                <span className="detail-value">{new Date(selectedItem.contractDetails.startDate).toLocaleDateString()}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">End Date:</span>
                <span className="detail-value">{new Date(selectedItem.contractDetails.endDate).toLocaleDateString()}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Value:</span>
                <span className="detail-value">${selectedItem.contractDetails.value}</span>
              </div>
            </>
          )}
          
          {selectedItem.scheduleDetails && (
            <>
              <h3>Schedule Details</h3>
              <div className="detail-row">
                <span className="detail-label">Time:</span>
                <span className="detail-value">{selectedItem.scheduleDetails.time}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Duration:</span>
                <span className="detail-value">{selectedItem.scheduleDetails.duration}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Participants:</span>
                <span className="detail-value">{selectedItem.scheduleDetails.participants.join(', ')}</span>
              </div>
            </>
          )}
          
          <div className="detail-actions">
            <button className="primary-button">Download</button>
            <button className="secondary-button">Print</button>
          </div>
        </div>
      </div>
    );
  };

  // Add missing function for contracts table
  const renderContractsTable = () => {
    const filteredContracts = filterItems(contracts);
    const sortedContracts = sortItems(filteredContracts);
    
    return (
      <div className="data-section-hr-core">
        <div className="section-header-hr-core">
          <h2>CONTRACTS</h2>
        </div>
        
        <div className="date-filter">
          <div className="filter-pills">
            <button 
              className={`filter-pill filter-pill-pending-pharmacist ${activeFilters.pendingPharmacist ? 'active' : ''}`}
              onClick={() => toggleFilter('pendingPharmacist')}
            >
              Pending Pharmacist
            </button>
            <button 
              className={`filter-pill filter-pill-pending-signature ${activeFilters.pendingSignature ? 'active' : ''}`}
              onClick={() => toggleFilter('pendingSignature')}
            >
              Pending Signature
            </button>
            <button 
              className={`filter-pill filter-pill-validated ${activeFilters.validated ? 'active' : ''}`}
              onClick={() => toggleFilter('validated')}
            >
              Validated
            </button>
            <button 
              className={`filter-pill filter-pill-past-contracts ${activeFilters.pastContracts ? 'active' : ''}`}
              onClick={() => toggleFilter('pastContracts')}
            >
              Past Contracts
            </button>
          </div>
          
          <div className="date-controls">
            <div className="date-input-container">
              <label>From:</label>
              <input 
                type="date" 
                value={fromDate} 
                onChange={(e) => handleDateFilterChange('from', e.target.value)} 
              />
            </div>
            
            <div className="date-input-container">
              <label>To:</label>
              <input 
                type="date" 
                value={toDate} 
                onChange={(e) => handleDateFilterChange('to', e.target.value)} 
              />
            </div>
            
            <button className="clear-filter-button" onClick={clearDateFilter}>
              Clear Filters
            </button>
          </div>
        </div>
        
        {sortedContracts.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th 
                  className="sortable-header" 
                  onClick={() => handleSort('title')}
                >
                  Title
                  {sortOption === 'title' && (
                    <span className="sort-arrow">
                      {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                    </span>
                  )}
                </th>
                <th 
                  className="sortable-header" 
                  onClick={() => handleSort('company')}
                >
                  Company
                  {sortOption === 'company' && (
                    <span className="sort-arrow">
                      {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                    </span>
                  )}
                </th>
                <th 
                  className="sortable-header" 
                  onClick={() => handleSort('date')}
                >
                  Date
                  {sortOption === 'date' && (
                    <span className="sort-arrow">
                      {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                    </span>
                  )}
                </th>
                <th 
                  className="sortable-header" 
                  onClick={() => handleSort('location')}
                >
                  Location
                  {sortOption === 'location' && (
                    <span className="sort-arrow">
                      {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                    </span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedContracts.map((contract) => (
                <tr key={contract.id} onClick={() => handleItemClick(contract)}>
                  <td>{contract.title}</td>
                  <td>{contract.companyName}</td>
                  <td>{new Date(contract.date).toLocaleDateString()}</td>
                  <td>{contract.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-data-message">No contracts found for the selected period</p>
        )}
      </div>
    );
  };

  // Add missing function for schedule table
  const renderScheduleTable = () => {
    const filteredSchedule = filterItems(scheduleItems);
    const sortedSchedule = sortItems(filteredSchedule);
    
    return (
      <div className="data-section-hr-core">
        <div className="section-header-hr-core">
          <h2>SCHEDULE</h2>
        </div>
        
        <div className="date-filter">
          <div className="filter-pills">
            <button 
              className={`filter-pill filter-pill-pending-pharmacist ${activeFilters.pendingPharmacist ? 'active' : ''}`}
              onClick={() => toggleFilter('pendingPharmacist')}
            >
              Pending Pharmacist
            </button>
            <button 
              className={`filter-pill filter-pill-pending-signature ${activeFilters.pendingSignature ? 'active' : ''}`}
              onClick={() => toggleFilter('pendingSignature')}
            >
              Pending Signature
            </button>
            <button 
              className={`filter-pill filter-pill-validated ${activeFilters.validated ? 'active' : ''}`}
              onClick={() => toggleFilter('validated')}
            >
              Validated
            </button>
            <button 
              className={`filter-pill filter-pill-past-contracts ${activeFilters.pastContracts ? 'active' : ''}`}
              onClick={() => toggleFilter('pastContracts')}
            >
              Past Contracts
            </button>
          </div>
          
          <div className="date-controls">
            <div className="date-input-container">
              <label>From:</label>
              <input 
                type="date" 
                value={fromDate} 
                onChange={(e) => handleDateFilterChange('from', e.target.value)} 
              />
            </div>
            
            <div className="date-input-container">
              <label>To:</label>
              <input 
                type="date" 
                value={toDate} 
                onChange={(e) => handleDateFilterChange('to', e.target.value)} 
              />
            </div>
            
            <button className="clear-filter-button" onClick={clearDateFilter}>
              Clear Filters
            </button>
          </div>
        </div>
        
        {sortedSchedule.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th 
                  className="sortable-header" 
                  onClick={() => handleSort('title')}
                >
                  Title
                  {sortOption === 'title' && (
                    <span className="sort-arrow">
                      {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                    </span>
                  )}
                </th>
                <th 
                  className="sortable-header" 
                  onClick={() => handleSort('company')}
                >
                  Company
                  {sortOption === 'company' && (
                    <span className="sort-arrow">
                      {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                    </span>
                  )}
                </th>
                <th 
                  className="sortable-header" 
                  onClick={() => handleSort('date')}
                >
                  Date
                  {sortOption === 'date' && (
                    <span className="sort-arrow">
                      {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                    </span>
                  )}
                </th>
                <th 
                  className="sortable-header" 
                  onClick={() => handleSort('location')}
                >
                  Location
                  {sortOption === 'location' && (
                    <span className="sort-arrow">
                      {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                    </span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedSchedule.map((schedule) => (
                <tr key={schedule.id} onClick={() => handleItemClick(schedule)}>
                  <td>{schedule.title}</td>
                  <td>{schedule.companyName}</td>
                  <td>{new Date(schedule.date).toLocaleDateString()}</td>
                  <td>{schedule.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-data-message">No schedule items found for the selected period</p>
        )}
      </div>
    );
  };

  // Add missing function for contacts table
  const renderContactsTable = () => {
    const contacts = [
      {
        id: 1,
        name: 'Dr. John Smith',
        company: 'MedPharm Ltd',
        email: 'john.smith@medpharm.com',
        phone: '+41 76 123 45 67',
        lastWorkingDay: '2023-12-15'
      },
      {
        id: 2,
        name: 'Sarah Johnson',
        company: 'HealthPlus',
        email: 'sarah.j@healthplus.ch',
        phone: '+41 79 987 65 43',
        lastWorkingDay: '2024-03-22'
      },
      {
        id: 3,
        name: 'Michael Brown',
        company: 'Swiss Medical Center',
        email: 'm.brown@swissmedical.ch',
        phone: '+41 78 456 78 90',
        lastWorkingDay: '2024-05-10'
      }
    ];
    
    const filteredContacts = filterItems(contacts);
    const sortedContacts = sortItems(filteredContacts);
    
    return (
      <div className="data-section-hr-core">
        <div className="section-header-hr-core">
          <h2>CONTACTS</h2>
        </div>
        
        <div className="date-filter">
          <div className="filter-pills">
            <button 
              className={`filter-pill filter-pill-pending-pharmacist ${activeFilters.pendingPharmacist ? 'active' : ''}`}
              onClick={() => toggleFilter('pendingPharmacist')}
            >
              Pending Pharmacist
            </button>
            <button 
              className={`filter-pill filter-pill-pending-signature ${activeFilters.pendingSignature ? 'active' : ''}`}
              onClick={() => toggleFilter('pendingSignature')}
            >
              Pending Signature
            </button>
            <button 
              className={`filter-pill filter-pill-validated ${activeFilters.validated ? 'active' : ''}`}
              onClick={() => toggleFilter('validated')}
            >
              Validated
            </button>
            <button 
              className={`filter-pill filter-pill-past-contracts ${activeFilters.pastContracts ? 'active' : ''}`}
              onClick={() => toggleFilter('pastContracts')}
            >
              Past Contracts
            </button>
          </div>
          
          <div className="date-controls">
            <div className="date-input-container">
              <label>From:</label>
              <input 
                type="date" 
                value={fromDate} 
                onChange={(e) => handleDateFilterChange('from', e.target.value)} 
              />
            </div>
            
            <div className="date-input-container">
              <label>To:</label>
              <input 
                type="date" 
                value={toDate} 
                onChange={(e) => handleDateFilterChange('to', e.target.value)} 
              />
            </div>
            
            <button className="clear-filter-button" onClick={clearDateFilter}>
              Clear Filters
            </button>
          </div>
        </div>
        
        {sortedContacts.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th 
                  className="sortable-header" 
                  onClick={() => handleSort('name')}
                >
                  Name
                  {sortOption === 'name' && (
                    <span className="sort-arrow">
                      {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                    </span>
                  )}
                </th>
                <th 
                  className="sortable-header" 
                  onClick={() => handleSort('company')}
                >
                  Company
                  {sortOption === 'company' && (
                    <span className="sort-arrow">
                      {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                    </span>
                  )}
                </th>
                <th>Email</th>
                <th>Phone</th>
                <th 
                  className="sortable-header" 
                  onClick={() => handleSort('lastWorkingDay')}
                >
                  Last Working Day
                  {sortOption === 'lastWorkingDay' && (
                    <span className="sort-arrow">
                      {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                    </span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedContacts.map((contact) => (
                <tr key={contact.id}>
                  <td>{contact.name}</td>
                  <td>{contact.company}</td>
                  <td>{contact.email}</td>
                  <td>{contact.phone}</td>
                  <td>{contact.lastWorkingDay ? new Date(contact.lastWorkingDay).toLocaleDateString() : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-data-message">No contacts found for the selected period</p>
        )}
      </div>
    );
  };

  // Add missing event handler functions
  const handleSaveEvent = (updatedEvent, shouldClose) => {
    // Here you would typically save to your database
    // For now, we'll just add to our local state if it's a new event
    
    if (updatedEvent.id.startsWith('new-schedule-')) {
      const newScheduleItem = {
        id: `schedule${scheduleItems.length + 1}`,
        title: updatedEvent.title,
        companyName: 'New Company', // This could be selected in the form
        date: updatedEvent.start.toISOString().split('T')[0],
        description: updatedEvent.notes || 'New schedule item',
        location: updatedEvent.location || 'TBD',
        scheduleDetails: {
          time: `${updatedEvent.start.toTimeString().substring(0, 5)} - ${updatedEvent.end.toTimeString().substring(0, 5)}`,
          duration: `${(updatedEvent.end - updatedEvent.start) / (1000 * 60 * 60)} hours`,
          participants: updatedEvent.employees || []
        }
      };
      
      if (shouldClose) {
        setScheduleItems([...scheduleItems, newScheduleItem]);
        setShowEventPanel(false);
      }
    }
  };

  const handleDeleteEvent = () => {
    // For new events, simply close the panel
    setShowEventPanel(false);
  };

  // Add the missing handleAddNewSchedule function
  const handleAddNewSchedule = (e) => {
    // Set the position for the event panel to appear
    const buttonRect = e.currentTarget.getBoundingClientRect();
    setEventPanelPosition({
      x: buttonRect.right,
      y: buttonRect.top
    });
    
    // Create a new event with default values
    const now = new Date();
    const endTime = new Date(now);
    endTime.setHours(now.getHours() + 1);
    
    setNewEvent({
      id: `new-schedule-${Date.now()}`,
      title: 'New Schedule',
      start: now,
      end: endTime,
      color: colorOptions[3].color,
      color1: colorOptions[3].color1,
      color2: colorOptions[3].color2,
      notes: '',
      location: '',
      employees: []
    });
    
    setShowEventPanel(true);
  };

  const renderContent = () => {
    if (selectedItem) {
      return renderDetailView();
    }
    
    switch(activeTab) {
      case 'contracts':
        return renderContractsTable();
      case 'schedule':
        return renderScheduleTable();
      case 'contacts':
        return renderContactsTable();
      case 'profile':
        return renderUserProfile();
      case 'banking':
        return renderBankingInfo();
      default:
        return renderContractsTable(); // Default to contracts view
    }
  };

  // New function to navigate to calendar page for adding schedules
  const navigateToCalendar = () => {
    navigate('/en/dashboard/calendar');
  };

  if (isLoading) {
    return (
      <div className="content-panel">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-panel">
        <div className="error-message">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="personal-account">
      <div className="panel-header">
        <img 
          src={logo}
          alt="Marketplace Logo" 
          className="panel-logo"
        />
      </div>
      <div className="account-container">
        {renderSidebar()}
        <div className="main-content-account-container">
          {renderContent()}
        </div>
      </div>
      
      {showEventPanel && newEvent && (
        <EventPanel
          event={newEvent}
          position={eventPanelPosition}
          onClose={() => setShowEventPanel(false)}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          colorOptions={colorOptions}
        />
      )}
    </div>
  );
};

export default HRCore;