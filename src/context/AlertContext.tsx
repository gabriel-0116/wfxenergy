"use client";

import { createContext, useContext, useState } from "react";

type AlertType = "success" | "error" | "info" | "warning";

interface AlertContextProps {
  showAlert: (message: string, type?: AlertType) => void;
}

const AlertContext = createContext<AlertContextProps | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert precisa estar dentro de <AlertProvider>");
  }
  return context;
};

export const AlertProvider = ({ children }: { children: React.ReactNode }) => {
  const [message, setMessage] = useState("");
  const [type, setType] = useState<AlertType>("success");
  const [visible, setVisible] = useState(false);

  const showAlert = (msg: string, tipo: AlertType = "success") => {
    setMessage(msg);
    setType(tipo);
    setVisible(true);

    setTimeout(() => setVisible(false), 3000); // oculta após 3s
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {visible && (
  <div className="fixed z-50 top-36 right-6 animate-fade-in">
    <div
      className={`alert shadow-lg w-fit ${
        type === "success"
          ? "alert-success"
          : type === "error"
          ? "alert-error"
          : type === "warning"
          ? "alert-warning"
          : "alert-info"
      }`}
    >
      {/* Ícone SVG fixo ou dinâmico */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="stroke-current flex-shrink-0 h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M5 13l4 4L19 7"
        />
      </svg>
      <span>{message}</span>
    </div>
  </div>
)}
    </AlertContext.Provider>
  );
};
