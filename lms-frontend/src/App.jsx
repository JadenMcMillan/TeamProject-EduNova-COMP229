import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import { useAuth } from './context/AuthContext';
import Catalogue from './pages/Catalogue';
import CourseDetail from './pages/CourseDetail';
import MyLearning from './pages/MyLearning';
import InstructorDashboard from './pages/InstructorDashboard';
import CourseEditor from './pages/CourseEditor';
import AdminUsers from './pages/AdminUsers';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

const FullPageLoader = () => (
  <div className="grid min-h-[60vh] place-items-center">
    <div className="flex items-center gap-3 text-sm font-medium text-ink-500">
      <Spinner size={18} className="text-brand-600" />
      Loading your workspace…
    </div>
  </div>
);

/** Blocks anonymous visitors and, optionally, roles that are not allowed in. */
const RequireRole = ({ roles, children }) => {
  const { user, booting } = useAuth();
  const location = useLocation();

  if (booting) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/forbidden" replace />;
  return children;
};

export default function App() {
  return (
    <Routes>
      {/* Auth pages use their own full-bleed layout */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <Layout>
            <Outlet />
          </Layout>
        }
      >
        <Route index element={<Catalogue />} />
        <Route path="/courses/:courseId" element={<CourseDetail />} />
        <Route
          path="/my-learning"
          element={
            <RequireRole roles={['student', 'admin']}>
              <MyLearning />
            </RequireRole>
          }
        />
        <Route
          path="/teach"
          element={
            <RequireRole roles={['instructor', 'admin']}>
              <InstructorDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/teach/courses/:courseId"
          element={
            <RequireRole roles={['instructor', 'admin']}>
              <CourseEditor />
            </RequireRole>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireRole roles={['admin']}>
              <AdminUsers />
            </RequireRole>
          }
        />
        <Route path="/forbidden" element={<NotFound variant="forbidden" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
