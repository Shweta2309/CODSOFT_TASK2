import { useState, useEffect } from 'react';
import './App.css';

const API_URL = `${import.meta.env.VITE_API_URL}/api/jobs`;

function App() {
  const [search, setSearch] = useState('');
  const [showAuth, setShowAuth] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [authData, setAuthData] = useState({
  name: '',
  email: '',
  password: '',
  role: 'candidate'
});
  const [jobs, setJobs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
const [editingJob, setEditingJob] = useState(null);
const [showCandidateDashboard, setShowCandidateDashboard] = useState(false);
const [candidateEmail, setCandidateEmail] = useState('');
const [candidateApplications, setCandidateApplications] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplyForm, setShowApplyForm,] = useState(false);
   const [applicant, setApplicant] = useState({
  name: loggedInUser?.name || '',
  email: loggedInUser?.email || ''
});
useEffect(() => {
  if (loggedInUser) {
    setApplicant({
      name: loggedInUser.name || '',
      email: loggedInUser.email || ''
    });
  }
}, [loggedInUser]);

const [resume, setResume] = useState(null);
  const [newJob, setNewJob] = useState({
    title: '',
    company: '',
    location: '',
    type: 'Full Time'
  });

  useEffect(() => {
    fetch(API_URL)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch jobs');
        return res.json();
      })
      .then(data =>{ 
        console.log('Jobs received:',data)
      setJobs(data)
  })
      .catch(error => console.error('Error loading jobs:', error));
  }, []);
const handleAuth = async (e) => {
  e.preventDefault();

  const endpoint = authMode === 'register'
    ? 'register'
    : 'login';

  try {
    const response = await fetch(
`${import.meta.env.VITE_API_URL}/api/${endpoint}`,      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(authData)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Authentication failed');
    }
    setAuthToken(data.token || null);
    setLoggedInUser(data.user);
    setShowAuth(false);

    setAuthData({
      name: '',
      email: '',
      password: '',
      role: 'candidate'
    });

    alert(data.message);

  } catch (error) {
    alert(error.message);
  }
};
  const filteredJobs = jobs.filter(job =>
    `${job.title} ${job.company} ${job.location}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(API_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  },
  body: JSON.stringify(newJob)
});

      if (!response.ok) {
        throw new Error('Could not save job');
      }

      const savedJob = await response.json();

      setJobs(prevJobs => [savedJob, ...prevJobs]);

      setNewJob({
        title: '',
        company: '',
        location: '',
        type: 'Full Time'
      });

      setShowForm(false);
      alert('Job saved successfully!');

    } catch (error) {
      alert('Job could not be saved. Check your server.');
      console.error(error);
    }
  };

  const handleLogout = () => {
  setLoggedInUser(null);
  setAuthToken(null);
  setShowAuth(true);
  setAuthMode('login');
};


  const handleEdit = async (e) => {
  e.preventDefault();

  try {
    const response = await fetch(
      `${API_URL}/${editingJob._id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(editingJob)
      }
    );

    const data = await response.json();

if (!response.ok) {
  throw new Error(data.message || 'Could not update job');
}

const updatedJob = data;

    setJobs(prevJobs =>
      prevJobs.map(job =>
        job._id === updatedJob._id ? updatedJob : job
      )
    );

    setEditingJob(null);
    alert('Job updated successfully!');

  } catch (error) {
    alert(error.message);
  }
};
const handleDelete = async (id) => {
  const confirmDelete = window.confirm(
    'Are you sure you want to delete this job?'
  );

  if (!confirmDelete) return;

  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
        },
    });

    if (!response.ok) {
      throw new Error('Could not delete job');
    }

    setJobs(prevJobs =>
      prevJobs.filter(job => job._id !== id)
    );

    alert('Job deleted successfully!');

  } catch (error) {
    alert(error.message);
  }
};
const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApply = async (e) => {
  e.preventDefault();
  if (isSubmitting) return;

  if (!resume) {
    alert('Please upload your resume.');
    return;
  }
  setIsSubmitting(true);

  const formData = new FormData();
  formData.append('jobId', selectedJob._id);
  formData.append('name', applicant.name);
  formData.append('email', applicant.email);
  formData.append('resume', resume);

  try {
const response = await fetch(`${import.meta.env.VITE_API_URL}/api/applications`, {    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    body: formData
  });


    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Application failed');
    }

    alert('Application submitted successfully!');
    setApplicant({ name: '', email: '' });
    setResume(null);
  } 
  catch (error) {
    alert(error.message || 'Could not submit application. Check your server.');
    console.error(error);
  }
  finally{
    setIsSubmitting(false);
  }
};
const handleCandidateSearch = async () => {
  try {
    const response = await fetch(
         `${import.meta.env.VITE_API_URL}/api/candidate-applications`,      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch applications');
    }

    setCandidateApplications(data);
  } catch (error) {
    alert(error.message);
  }
};
useEffect(() => {
  if (showCandidateDashboard && authToken) {
    handleCandidateSearch();
  }
}, [showCandidateDashboard, authToken]);

if (showAuth) {
  return (
    <div className="app auth-page">
      <section className="jobs-section auth-section">
        <h2>JobFinder</h2>

        <h3>
          {authMode === 'login' ? 'Welcome Back!' : 'Create Account'}
        </h3>

        <form onSubmit={handleAuth} className="job-form auth-form">

          {authMode === 'register' && (
            <input
              type="text"
              placeholder="Full Name"
              value={authData.name}
              onChange={e => setAuthData({
                ...authData,
                name: e.target.value
              })}
              required
            />
          )}

          <input
            type="email"
            placeholder="Email Address"
            value={authData.email}
            onChange={e => setAuthData({
              ...authData,
              email: e.target.value
            })}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={authData.password}
            onChange={e => setAuthData({
              ...authData,
              password: e.target.value
            })}
            required
          />

          {authMode === 'register' && (
            <select
              value={authData.role}
              onChange={e => setAuthData({
                ...authData,
                role: e.target.value
              })}
            >
              <option value="candidate">Candidate</option>
              <option value="employer">Employer</option>
            </select>
          )}

          <button type="submit">
            {authMode === 'login' ? 'Login' : 'Register'}
          </button>

        </form>

        <p>
          {authMode === 'login'
            ? "Don't have an account?"
            : 'Already have an account?'}
        </p>

        <button
          onClick={() => setAuthMode(
            authMode === 'login' ? 'register' : 'login'
          )}
        >
          {authMode === 'login' ? 'Create Account' : 'Login'}
        </button>
      </section>
    </div>
  );
}
 if (selectedJob) {
  return (
    <div className="app job-details-page">

      {!showApplyForm ? (
        <>
          <nav className="navbar">
            <h2>Job<span>Finder</span></h2>

            <button
              className="back-jobs-btn"
              onClick={() => {
                setSelectedJob(null);
                setShowApplyForm(false);
              }}
            >
              ← Back to Jobs
            </button>
          </nav>

          <main className="job-details-container">

            <div className="details-heading">
              <span className="apply-tag">JOB DETAILS</span>
              <h1>Your next career <span>opportunity.</span></h1>
              <p>Explore the opportunity and take the next step.</p>
            </div>

            <section className="job-details-card">

              <div className="details-icon">💼</div>

              <span className="job-type">{selectedJob.type}</span>

              <h2>{selectedJob.title}</h2>

              <p className="details-company">
                {selectedJob.company}
              </p>

              <div className="details-divider"></div>

              <div className="details-info">
                <div>
                  <span>📍</span>
                  <div>
                    <small>Location</small>
                    <p>{selectedJob.location}</p>
                  </div>
                </div>

                <div>
                  <span>💼</span>
                  <div>
                    <small>Job Type</small>
                    <p>{selectedJob.type}</p>
                  </div>
                </div>

                <div>
                  <span>🏢</span>
                  <div>
                    <small>Company</small>
                    <p>{selectedJob.company}</p>
                  </div>
                </div>
              </div>

              <button
                className="apply-now-btn"
                onClick={() => setShowApplyForm(true)}
              >
                Apply Now →
              </button>

            </section>

            <button
              className="back-jobs-bottom"
              onClick={() => setSelectedJob(null)}
            >
              ← Explore More Jobs
            </button>

          </main>
        </>
      ) : (
        <>
          <nav className="navbar">
            <h2>Job<span>Finder</span></h2>

            <button
              className="back-jobs-btn"
              onClick={() => setShowApplyForm(false)}
            >
              ← Back to Job Details
            </button>
          </nav>

          <main className="apply-container">

            <div className="apply-heading">
              <span className="apply-tag">APPLICATION PORTAL</span>
              <h1>Apply for your <span>next opportunity.</span></h1>
              <p>Take the next step towards your dream career.</p>
            </div>

            <section className="apply-card">

              <div className="apply-job-info">
                <div className="apply-job-icon">💼</div>

                <div>
                  <span className="job-type">{selectedJob.type}</span>
                  <h2>{selectedJob.title}</h2>
                  <p>{selectedJob.company}</p>
                  <p>📍 {selectedJob.location}</p>
                </div>
              </div>

              <div className="apply-divider"></div>

              <div className="apply-form-heading">
                <h2>Application Details</h2>
                <p>Please review your information before submitting.</p>
              </div>

              <form
                onSubmit={handleApply}
                className="application-form"
                encType="multipart/form-data"
              >

                <div className="apply-field">
                  <label>Your Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={applicant.name}
                    onChange={e => setApplicant({
                      ...applicant,
                      name: e.target.value
                    })}
                    required
                  />
                </div>

                <div className="apply-field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={applicant.email}
                    onChange={e => setApplicant({
                      ...applicant,
                      email: e.target.value
                    })}
                    required
                  />
                </div>

                <div className="apply-field">
                  <label>Upload Your Resume</label>

                  <div className="resume-upload-box">
                    <span className="resume-icon">📄</span>
                    <h3>Choose your resume</h3>
                    <p>PDF format only · Maximum size 5 MB</p>

                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={e => setResume(e.target.files[0] || null)}
                      required
                    />

                    {resume && (
                      <p className="selected-resume">
                        ✓ {resume.name}
                      </p>
                    )}
                  </div>
                </div>

                <button type="submit" 
                        className="submit-application-btn"
                        disabled= {isSubmitting} >
                  {isSubmitting ? 'Submitting...' : 'Submit Application →'} 
                </button>

              </form>

            </section>

            <button
              className="back-jobs-bottom"
              onClick={() => setShowApplyForm(false)}
            >
              ← Back to Job Details
            </button>

          </main>
        </>
      )}
    </div>
  );
}
  if (showDashboard) {
  return (
    <div className="app">
      <nav className="navbar">
        <h2>Job<span>Finder</span></h2>
        <button
  className="back-home-btn"
  onClick={() => setShowDashboard(false)}
>
  ← Back to Home
</button>

      </nav>

      <main className="jobs-section">
        <h2>Employer Dashboard</h2>
        <p className="subtitle">{jobs.length} jobs posted</p>
        {editingJob && (
  <form onSubmit={handleEdit} className="edit-job-form">
    <h3>Edit Job</h3>

    <input
      type="text"
      placeholder="Job Title"
      value={editingJob.title}
      onChange={e => setEditingJob({...editingJob, title: e.target.value})}
      required
    />

    <input
      type="text"
      placeholder="Company"
      value={editingJob.company}
      onChange={e => setEditingJob({...editingJob, company: e.target.value})}
      required
    />

    <input
      type="text"
      placeholder="Location"
      value={editingJob.location}
      onChange={e => setEditingJob({...editingJob, location: e.target.value})}
      required
    />

    <select
      value={editingJob.type}
      onChange={e => setEditingJob({...editingJob, type: e.target.value})}
    >
      <option>Full Time</option>
      <option>Part Time</option>
      <option>Internship</option>
      <option>Remote</option>
    </select>

    <button type="submit">Save Changes</button>
    <button type="button" onClick={() => setEditingJob(null)}>
      Cancel
    </button>
  </form>
)}

        <div className="job-grid">
          {jobs.map(job => (
            <article className="job-card" key={job._id}>
              <h3>{job.title}</h3>
              <p>{job.company}</p>
              <p>{job.location}</p>
              <p>Job Type: {job.type}</p>

              <button onClick={() => setEditingJob({...job})}>
                Edit
              </button>

              <button onClick={() => handleDelete(job._id)}>
                Delete
              </button>
            </article>
          ))}
        </div>

        {jobs.length === 0 && <p>No jobs posted yet.</p>}
      </main>
    </div>
  );
}
if (showCandidateDashboard) {
  return (
    <div className="app">
      <nav className="navbar">
        <h2>Job<span>Finder</span></h2>
        <button
  className="back-home-btn"
  onClick={() => setShowCandidateDashboard(false)}
>
  ← Back to Home
</button>
      </nav>

      <main className="jobs-section">
        <h2>My Applications</h2>
        <p className="subtitle">
          Track the jobs you have applied for.
        </p>

        <button className="refresh-applications-btn"
                onClick={handleCandidateSearch}>
           Refresh Applications
        </button>
        <div className="job-grid">
          {candidateApplications.length === 0 ? (
            <p>No applications found yet.</p>
          ) : (
            candidateApplications.map((application) => (
              <div className="job-card" key={application._id}>
                <h3>{application.jobId?.title || 'Job no longer available'}</h3>
                <p>Company: {application.jobId?.company || 'N/A'}</p>
                <p>Location: {application.jobId?.location || 'N/A'}</p>
                <p>Name: {application.name}</p>
                <p>Email: {application.email}</p>
                <p>Resume: {application.resume}</p>
                <p>
                  Applied on: {new Date(application.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
  return (
    <div className="app">

      <nav className="navbar">
        <h2>Job<span>Finder</span></h2>

        <div className="nav-links">
  <a href="#jobs">Find Jobs</a>

  {loggedInUser.role === 'employer' && (
    <>
      <button 
      className="nav-btn"
      onClick={() => setShowDashboard(true)}>
        Employer Dashboard
      </button>

      <a
        href="#post-job"
        className="post-job-btn"
        onClick={() => setShowForm(true)}
      >
        Post a Job
      </a>
    </>
  )}

 {loggedInUser.role === 'candidate' && (
  <button
    className="nav-btn"
    onClick={() => setShowCandidateDashboard(true)}
  >
    My Applications
  </button>
)}

<button className="nav-btn" onClick={handleLogout}>
  Logout
</button>

  
  </div>
      </nav>

      <header className="hero">
        <p className="tagline">YOUR CAREER STARTS HERE</p>

        <h1>
          Find your <span>dream job.</span>
        </h1>

        <p>
          Discover opportunities that match your skills and ambitions.
        </p>

        <input
          type="text"
          placeholder="Search job title, company or location..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </header>

      {showForm && (
        <form
          id="post-job"
          className="post-job-form"
          onSubmit={handleSubmit}
        >
          <h2>Post a New Job</h2>

          <input
            placeholder="Job Title"
            value={newJob.title}
            onChange={e =>
              setNewJob({ ...newJob, title: e.target.value })
            }
            required
          />

          <input
            placeholder="Company Name"
            value={newJob.company}
            onChange={e =>
              setNewJob({ ...newJob, company: e.target.value })
            }
            required
          />

          <input
            placeholder="Location"
            value={newJob.location}
            onChange={e =>
              setNewJob({ ...newJob, location: e.target.value })
            }
            required
          />

          <select
            value={newJob.type}
            onChange={e =>
              setNewJob({ ...newJob, type: e.target.value })
            }
          >
            <option>Full Time</option>
            <option>Part Time</option>
            <option>Remote</option>
            <option>Internship</option>
          </select>

          <button type="submit">
            Publish Job
          </button>

          <button
            type="button"
            onClick={() => setShowForm(false)}
          >
            Cancel
          </button>
        </form>
      )}

      <main id="jobs" className="jobs-section">
        <h2>Explore Opportunities</h2>

        <p className="subtitle">
          {filteredJobs.length} jobs available
        </p>

        <div className="job-grid">
          {filteredJobs.map(job => (
            <article className="job-card" key={job._id}>
              <div className="job-icon">💼</div>

              <span className="job-type">
                {job.type}
              </span>

              <h3>{job.title}</h3>

              <p className="company">
                {job.company}
              </p>

              <p className="location">
                📍 {job.location}
              </p>

              <button onClick={() =>{
                 setSelectedJob(job); 
                  setShowApplyForm(false);
              }}>
                View Details →
              </button>
            </article>
          ))}
        </div>

        {filteredJobs.length === 0 && (
          <p>No jobs found. Try another search.</p>
        )}
      </main>

      <footer>
        © 2026 JobFinder · Built for your next opportunity.
      </footer>

    </div>
  );
}

export default App;