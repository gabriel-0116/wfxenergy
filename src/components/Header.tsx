"use client";
import { useRouter } from "next/navigation";
import React, { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  faCaretDown,
  faGear,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";

export default function Header() {
  const auth = useContext(AuthContext);
  const [showModal, setShowModal] = useState(false);

  const { signOut } = useContext(AuthContext) || {};
  const router = useRouter();

  const handleLogout = async () => {
    if (signOut) {
      await signOut();
      router.push("/login");
    }
  };

  if (!auth) return null;

  const { user, role } = auth;
  const displayName = user?.displayName ?? "Usuário";
  const displayRole = role ?? "guest";

  return (
    <header className="w-full flex items-center justify-between bg-[#212325] h-20 px-6 shadow-2xl relative">
      {/* Espaço esquerdo (se quiser colocar ícone/menu no futuro) */}
      <div className="w-32" />

      {/* Centro: logo com triângulo discreto */}
      <div className="relative w-1/3 flex justify-center items-center">
        {/* Triângulo de fundo */}
        <div
          className="absolute w-full h-20 bg-gradient-to-r from-[#1c2129] via-[#253c57] to-[#1c2129] opacity-80 z-0"
          style={{
            clipPath: "polygon(0 0, 100% 0, 85% 100%, 15% 100%)",
          }}
        />

        {/* Texto da logo */}
        <h2 className="relative z-10 text-2xl font-bold text-white tracking-wide">
          WFX Energy
        </h2>
      </div>

      {/* Lado direito: avatar, nome, role, dropdown */}
      <div className="w-60 flex justify-end items-center gap-4">
        {/* Avatar */}
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt="Avatar"
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="bg-[#7C3AED] text-white w-10 h-10 flex items-center justify-center rounded-full font-bold">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Nome e role */}
        <div className="text-right">
          <div className="text-sm font-semibold text-white">{displayName}</div>
          <div className="text-xs text-gray-300">{displayRole}</div>
        </div>

        {/* Dropdown */}
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="btn btn-circle btn-sm btn-ghost"
          >
            <FontAwesomeIcon icon={faCaretDown} className="text-white" />
          </div>
          <ul
            tabIndex={0}
            className="dropdown-content z-50 menu p-2 mt-5 shadow-md bg-[#334155] rounded-box w-40"
          >
            <li>
              <Link
                href={"/configuraçao"}
                className="flex items-center gap-2 px-3 py-2 rounded transition hover:bg-blue-400 hover:font-bold w-full text-left cursor-pointer"
              >
                <FontAwesomeIcon icon={faGear} />
                Configurações
              </Link>
            </li>
            <li>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded transition hover:bg-red-500 hover:font-bold w-full text-left cursor-pointer"
              >
                <FontAwesomeIcon icon={faRightFromBracket} />
                Sair
              </button>
            </li>
          </ul>
        </div>
        {/* Modal de Confirmação */}
        {showModal && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-[#1e293b] text-white">
            <h3 className="font-bold text-lg">Deseja realmente sair?</h3>
            <p className="py-4">Essa ação irá encerrar sua sessão.</p>
            <div className="modal-action">
              <button
                className="btn btn-outline"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
              <button
                className="btn bg-red-500 hover:bg-red-900 text-white font-semibold"
                onClick={handleLogout}
              >
                Sair
              </button>
            </div>
          </div>
        </dialog>
      )}
      </div>
    </header>
  );
}
