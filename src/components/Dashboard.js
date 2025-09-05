import React from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="dashboard-container">
      <h2>Welcome to Stwipe!</h2>
      <p>You are now logged in.</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default Dashboard;
