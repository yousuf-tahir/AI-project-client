import { useState, useEffect } from 'react'
import './App.css'
import Login from './assets/components/Login'
import Register from './assets/components/Register'
import Navbar from './assets/components/Navbar'
import Home from './assets/components/Home'
import CandidateDashboard from './assets/components/CandidateDashboard'
import HrDashboard from './assets/components/HrDashboard'
import SetCriteriaWithErrorBoundary from './assets/components/SetCriteria'
import FeedbackDashboard from './assets/components/FeedbackDashboard'
import InterviewQuestions from './assets/components/InterviewQuestions'
import TinterviewsQuestions from './assets/components/TinterviewsQuestions'
import Interview from './assets/components/Interview'
import Notification from './assets/components/Notification'
import PracticeInterview from './assets/components/PracticeInterview'
import Profile from './assets/components/Profile'
import Settings from './assets/components/Settings'
import FullInterviewSchedule from './assets/components/FullInterviewSchedule'
import AdminDashboard from './assets/components/AdminDashboard';
import ScheduleInterview from './assets/components/ScheduleInterview';
import Candidate from './assets/components/Candidate';
import CandidatesApprovals from './assets/components/CandidatesApprovals';
import CandidateFeedback from './assets/components/CandidateFeedback';
import CandidateNotification from './assets/components/CandidateNotification';
import CandidateSetting from './assets/components/CandidateSetting';
import HRApprovals from './assets/components/HRApprovals';
import SystemLogs from './assets/components/SystemLogs';
import ViewFeedback from './assets/components/ViewFeedback';
import AdminSetting from './assets/components/adminsetting';
import JobDisplayWithErrorBoundary from './assets/components/JobDisplay';
import PublicJob from './assets/components/PublicJob';
import CandidateJobs from './assets/components/CandidateJobs';
import HRprofile from './assets/components/HRprofile';
import CandidatesApply from './assets/components/CandidatesApply';
import HRApplications from './assets/components/HRApplications';
import InterviewRoom from './assets/components/InterviewRoom';
import VoiceRecorder from './assets/components/VoiceRecorder';
// NEW: Analysis components
import HRAnalysisView from './assets/components/HRAnalysisView';
import CandidateAnalysisView from './assets/components/CandidateAnalysisView';
import HRAnalysisList from './assets/components/HRAnalysisList'
import CandidateAnalysisList from './assets/components/CandidateAnalysisList'


function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [user, setUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);

  // Simple navigation function
  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Set up browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Restore user ONCE on mount
  useEffect(() => {
    console.log('App mounted, restoring session (if any)...');
    try {
      const rawUser = localStorage.getItem('user') || sessionStorage.getItem('user');
      const rawToken = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (rawUser && rawToken) {
        try {
          const parsed = JSON.parse(rawUser);
          setUser(parsed);
          console.log('Restored user from storage:', parsed);
        } catch (e) {
          console.error('Failed parsing stored user, clearing storage', e);
          localStorage.removeItem('user'); sessionStorage.removeItem('user');
          localStorage.removeItem('token'); sessionStorage.removeItem('token');
          setUser(null);
        }
      } else {
        console.log('No stored user/token found');
      }
    } finally {
      setUserLoaded(true);
    }
  }, []);

  // Fix authentication timing - wait for user to load before route checks
  useEffect(() => {
    if (!userLoaded) return;

    console.log('Route changed to:', currentPath, 'userLoaded:', userLoaded, 'user:', user);

    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    const isPublic = ['/', '/register'].includes(currentPath) || currentPath.startsWith('/public/');
    if (!storedUser && !isPublic) {
      console.log('No user found, redirecting to login');
      navigate('/');
      return;
    }
    if (storedUser && !user) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log('Setting user from storage on route change:', parsedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error('Failed to parse stored user:', e);
      }
    }
  }, [currentPath, userLoaded, user]);

  // Simple router
  const renderContent = () => {
    if (!userLoaded) {
      return <div style={{ padding: 20 }}>Checking session...</div>;
    }

    const pathOnly = (currentPath || '').split('?')[0];

    // Public routes
    if (pathOnly === '/') {
      if (user) {
        setTimeout(() => navigate(`/${user.role.toLowerCase()}`), 0);
        return <div>Redirecting to dashboard...</div>;
      }
      return <Login onNavigate={navigate} setUser={setUser} />;
    }

    if (pathOnly === '/register') {
      return <Register onNavigate={navigate} />;
    }

    if (pathOnly.startsWith('/public/job/')) {
      return <PublicJob />;
    }

    // Interview room route
    if (pathOnly.startsWith('/interview-room/')) {
      if (!user) {
        setTimeout(() => navigate('/'), 0);
        return <div>Please log in to access the interview room</div>;
      }
      const interviewId = pathOnly.split('/interview-room/')[1];
      return <InterviewRoom interviewId={interviewId} onNavigate={navigate} user={user} />;
    }

    // NEW: HR Analysis Route
    if (pathOnly.startsWith('/hr-analysis/')) {
      if (user?.role?.toLowerCase() !== 'hr' && user?.role?.toLowerCase() !== 'admin') {
        return <div>Unauthorized: HR access only</div>;
      }
      const interviewId = pathOnly.split('/hr-analysis/')[1];
      return (
        <HRAnalysisView
          interviewId={interviewId}
          onNavigate={navigate}
          onBack={() => navigate('/hr')}
        />
      );
    }

    // NEW: Candidate Analysis Route
    if (pathOnly.startsWith('/candidate-analysis/')) {
      if (user?.role?.toLowerCase() !== 'candidate') {
        return <div>Unauthorized: Candidate access only</div>;
      }
      const interviewId = pathOnly.split('/candidate-analysis/')[1];
      return (
        <CandidateAnalysisView
          interviewId={interviewId}
          onBack={() => navigate('/candidate')}
        />
      );
    }

    // Protected routes
    if (!user) {
      const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (storedUser) {
        try { setUser(JSON.parse(storedUser)); return <div>Loading your session...</div>; } catch { }
      }
      setTimeout(() => navigate('/'), 0);
      return <div>Please log in to continue...</div>;
    }

    // Rest of route switch
    switch (pathOnly) {
      case '/home':
        return <Home />;
      case '/set-criteria':
        return (user?.role?.toLowerCase() === 'hr' || user?.role?.toLowerCase() === 'admin')
          ? <SetCriteriaWithErrorBoundary onNavigate={navigate} user={user} />
          : <div>Unauthorized: HR/Admin access required</div>;
      case '/job-display':
        if (user?.role?.toLowerCase() === 'hr' || user?.role?.toLowerCase() === 'admin') {
          return <JobDisplayWithErrorBoundary onNavigate={navigate} user={user} />;
        }
        return <div>Unauthorized: HR/Admin access required</div>;
      case '/profile':
        return <Profile onNavigate={navigate} />;
      case '/candidate':
        return user.role?.toLowerCase() === 'candidate'
          ? <CandidateDashboard onNavigate={navigate} />
          : <div>Unauthorized: Candidate access only</div>;
      case '/candidate-jobs':
        return user.role?.toLowerCase() === 'candidate'
          ? <CandidateJobs onNavigate={navigate} />
          : <div>Unauthorized: Candidate access only</div>;
      case '/hr-profile':
        return (user?.role?.toLowerCase() === 'hr' || user?.role?.toLowerCase() === 'admin')
          ? <HRprofile onNavigate={navigate} />
          : <div>Unauthorized: HR/Admin access required</div>;
      case '/candidates':
        if (user.role?.toLowerCase() === 'admin') {
          return <CandidatesApprovals onNavigate={navigate} />;
        }
        if (user.role?.toLowerCase() === 'hr') {
          return <Candidate onNavigate={navigate} />;
        }
        return <div>Unauthorized: Admin/HR access only</div>;
      case '/hr':
        return user.role?.toLowerCase() === 'hr'
          ? <HrDashboard onNavigate={navigate} />
          : <div>Unauthorized: HR access only</div>;
      case '/admin':
        return user.role?.toLowerCase() === 'admin'
          ? <AdminDashboard onNavigate={navigate} />
          : <div>Unauthorized: Admin access only</div>;
      case '/hr-approvals':
        return user.role?.toLowerCase() === 'admin'
          ? <HRApprovals onNavigate={navigate} />
          : <div>Unauthorized: Admin access only</div>;
      case '/feedback':
        return user.role?.toLowerCase() === 'admin'
          ? <ViewFeedback onNavigate={navigate} />
          : <FeedbackDashboard onNavigate={navigate} />;
      case '/system-logs':
        return user.role?.toLowerCase() === 'admin'
          ? <SystemLogs onNavigate={navigate} />
          : <div>Unauthorized: Admin access only</div>;
      case '/interview-questions':
        if (user?.role?.toLowerCase() === 'admin') {
          return <TinterviewsQuestions onNavigate={navigate} />;
        }
        if (user?.role?.toLowerCase() === 'hr') {
          return <InterviewQuestions onNavigate={navigate} user={user} />;
        }
        return <div>Unauthorized: HR/Admin access required</div>;
      case '/interview':
        return <Interview onNavigate={navigate} />;
      case '/practice-interview':
        return <PracticeInterview onNavigate={navigate} />;
      case '/candidate-feedback':
        return <CandidateFeedback onNavigate={navigate} />;
      case '/candidate-notifications':
        return <CandidateNotification onNavigate={navigate} />;
      case '/candidate-settings':
        return <CandidateSetting onNavigate={navigate} />;
      case '/notifications':
        return <Notification onNavigate={navigate} />;
      case '/candidates-apply':
        return <CandidatesApply onNavigate={navigate} />;
      case '/interview-page':
        navigate('/');
        return null;
      case '/applications':
        return user.role?.toLowerCase() === 'hr'
          ? <HRApplications onNavigate={navigate} />
          : <div>Unauthorized: HR access only</div>;
      case '/schedule-interview':
        return <ScheduleInterview onNavigate={navigate} />;
      case '/settings':
        return user.role?.toLowerCase() === 'admin'
          ? <AdminSetting onNavigate={navigate} />
          : <Settings onNavigate={navigate} />;
      case '/hr-analysis-list':
        return user.role?.toLowerCase() === 'hr'
          ? <HRAnalysisList onNavigate={navigate} />
          : <div>Unauthorized: HR access only</div>;

      case '/candidate-analysis-list':
        return user.role?.toLowerCase() === 'candidate'
          ? <CandidateAnalysisList onNavigate={navigate} />
          : <div>Unauthorized: Candidate access only</div>;
      case '/voice-recorder':
        return <VoiceRecorder />;
      default:
        return (
          <div style={{ padding: '20px' }}>
            <h2>404 - Page Not Found</h2>
            <p>The page you're looking for doesn't exist or you don't have permission to view it.</p>
            <button onClick={() => navigate('/')}>Go to Home</button>
          </div>
        );
    }
  };

  const pathNoQuery = (currentPath || '').split('?')[0];
  const isPublicRoute = ['/', '/register'].includes(pathNoQuery) || pathNoQuery.startsWith('/public/');
  const shouldHideNavbar =
    pathNoQuery.startsWith('/set-criteria') ||
    pathNoQuery === '/job-display' ||
    pathNoQuery === '/hr-profile' ||
    pathNoQuery === '/hr' ||
    pathNoQuery === '/interview-questions' ||
    pathNoQuery === '/interview' ||
    pathNoQuery === '/interview-page' ||
    pathNoQuery === '/practice-interview' ||
    pathNoQuery === '/candidate-feedback' ||
    pathNoQuery === '/candidate-notifications' ||
    pathNoQuery === '/candidate-settings' ||
    pathNoQuery === '/feedback' ||
    pathNoQuery === '/notifications' ||
    pathNoQuery === '/settings' ||
    pathNoQuery === '/schedule-interview' ||
    pathNoQuery === '/candidates' ||
    pathNoQuery === '/candidate' ||
    pathNoQuery === '/profile' ||
    pathNoQuery === '/admin' ||
    pathNoQuery === '/hr-approvals' ||
    pathNoQuery === '/hr-analysis-list' ||
    pathNoQuery === '/candidate-analysis-list' ||
    pathNoQuery === '/system-logs' ||
    pathNoQuery.startsWith('/interview-room/') ||
    pathNoQuery.startsWith('/hr-analysis/') ||  // NEW
    pathNoQuery.startsWith('/candidate-analysis/');  // NEW

  const hideForApply = pathNoQuery === '/candidates-apply';

  return (
    <div className={`app ${(shouldHideNavbar || hideForApply) ? 'full-page' : ''}`}>
      {!isPublicRoute && !(shouldHideNavbar || hideForApply) && <Navbar user={user} onNavigate={navigate} />}
      <main className={(shouldHideNavbar || hideForApply) ? 'full-page-content' : ''}>
        {renderContent()}
      </main>
    </div>
  )
}

export default App