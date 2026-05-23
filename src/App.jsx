import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import Chat from "./Chat";
import UserProfile from "./UserProfile";
import Settings from "./Settings";
import PWAInstallButton from "./components/PWAInstallButton";

const Private = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
};

const Public = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? <Navigate to="/chat" replace /> : children;
};

const App = () => (
  <>
    <Routes>
      <Route path="/" element={<Navigate to="/chat" replace />} />
      <Route path="/login" element={<Public><Login /></Public>} />
      <Route path="/register" element={<Public><Register /></Public>} />
      <Route path="/chat" element={<Private><Chat /></Private>} />
      <Route path="/profile/:id" element={<Private><UserProfile /></Private>} />
      <Route path="/settings" element={<Private><Settings /></Private>} />
    </Routes>
    <PWAInstallButton />
  </>
);

export default App;