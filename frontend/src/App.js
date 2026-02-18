import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewOrder from './pages/NewOrder';
import ProtectedRoute from './components/ProtectedRoute';
import OrdersList from './pages/OrdersList';
import AddInstaller from './pages/AddInstaller';
import InstallersList from './pages/InstallersList';
import InstallerDetail from './pages/InstallerDetail';
import OrderDetail from './pages/OrderDetail';
import Finance from './pages/Finance';
import Register from './pages/Register';
import MapPage from './pages/Map';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/new"
          element={
            <ProtectedRoute>
              <NewOrder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <OrdersList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/installers/new"
          element={
            <ProtectedRoute>
              <AddInstaller />
            </ProtectedRoute>
          }
        />
        <Route
          path="/installers"
          element={
            <ProtectedRoute>
              <InstallersList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/installers/:id"
          element={
            <ProtectedRoute>
              <InstallerDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute>
              <OrderDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance"
          element={
            <ProtectedRoute>
              <Finance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <MapPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;