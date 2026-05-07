import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import Chat from "./Chat";
import UserProfile from "./UserProfile";
import Settings from "./Settings";

const App = () => {
  const token = localStorage.getItem("token");

  return (
    <Routes>
      <Route
        path="/"
        element={token ? <Navigate to="/chat" /> : <Navigate to="/login" />}
      />

      <Route
        path="/login"
        element={token ? <Navigate to="/chat" /> : <Login />}
      />

      <Route
        path="/register"
        element={token ? <Navigate to="/chat" /> : <Register />}
      />

      <Route
        path="/chat"
        element={token ? <Chat /> : <Navigate to="/login" />}
      />

      <Route
        path="/profile/:id"
        element={token ? <UserProfile /> : <Navigate to="/login" />}
      />

      <Route
        path="/settings"
        element={token ? <Settings /> : <Navigate to="/login" />}
      />
    </Routes>
  );
};

export default App;