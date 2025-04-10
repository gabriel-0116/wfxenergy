"use client";

import { createContext, useContext, useState } from "react";

interface ConfirmContextProps {
  confirm: (message: string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextProps | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm precisa estar dentro do <ConfirmProvider>");
  return context;
};

export const ConfirmProvider = ({ children }: { children: React.ReactNode }) => {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const [resolver, setResolver] = useState<(value: boolean) => void>(() => () => {});

  const confirm = (msg: string) => {
    setMessage(msg);
    setVisible(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  };

  const handleConfirm = () => {
    resolver(true);
    setVisible(false);
  };

  const handleCancel = () => {
    resolver(false);
    setVisible(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {visible && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-base-200 text-white">
            <h3 className="font-bold text-lg">Confirmar ação</h3>
            <p className="py-4">{message}</p>
            <div className="modal-action">
              <button className="btn btn-sm btn-error" onClick={handleCancel}>
                Cancelar
              </button>
              <button className="btn btn-sm btn-success" onClick={handleConfirm}>
                Confirmar
              </button>
            </div>
          </div>
        </dialog>
      )}
    </ConfirmContext.Provider>
  );
};
