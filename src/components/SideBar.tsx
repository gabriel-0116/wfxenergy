"use client";
import { useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";
import Image from "next/image";
import Link from "next/link";
import {
  faHouse,
  faFolderOpen,
  faCalculator,
  faFileSignature,
  faFileContract,
  faClipboardList,
  faRightFromBracket,
  faGear,
  faUsersGear,
  faUser,
  faClockRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { usePathname } from "next/navigation";
import { versoes } from "@/utils/versoes";

export default function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useContext(AuthContext) || {};
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const handleLogout = async () => {
    if (signOut) {
      await signOut();
      router.push("/login");
    }
  };

  const menuItems = [
    { label: "Início", href: "/home", icon: faHouse },
    { label: "Clientes", href: "/clientes", icon: faUser },
    { label: "Projetos", href: "/projeto", icon: faFolderOpen },
    { label: "Precificação", href: "/precificacao", icon: faCalculator },
    { label: "Proposta Comercial", href: "/proposta", icon: faFileSignature },
    { label: "Contrato", href: "/contrato", icon: faFileContract },
    { label: "Relatórios", href: "/relatorios", icon: faClipboardList },
  ];

  const tools = [
    { label: "Painel Admin", href: "/admin", icon: faUsersGear },
    { label: "Configurações", href: "/configuracao", icon: faGear },
    { label: "Versões", href: "/versoes", icon: faClockRotateLeft },
  ];

  return (
    <>
      <aside className="w-64 h-screen bg-[#212325] text-white flex flex-col justify-between fixed shadow-2xl">
        <div>
          <div className="flex items-center justify-center p-6">
            <Image src="/logo.png" alt="Logo" width={120} height={40} />
          </div>

          <div className="my-6 border-t border-white mx-4" />

          <nav className="px-4">
            <ul className="space-y-2 text-md">
              {menuItems.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded transition
                      ${
                        pathname === item.href
                          ? "bg-gradient-to-r from-[#0a56ad]/40 to-[#425779]/20 border border-[#334155] font-bold"
                          : "hover:bg-[#425779]"
                      }`}
                  >
                    <FontAwesomeIcon icon={item.icon} />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="my-6 border-t border-white mx-4" />

          <nav className="px-4">
            <ul className="space-y-2 text-md">
              {tools.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded transition
                      ${
                        pathname === item.href
                          ? "bg-[#334155] font-semibold"
                          : "hover:bg-gray-700"
                      }`}
                  >
                    <FontAwesomeIcon icon={item.icon} />
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded transition hover:bg-red-500 w-full text-left cursor-pointer"
                >
                  <FontAwesomeIcon icon={faRightFromBracket} />
                  Sair
                </button>
              </li>
            </ul>
          </nav>
          <div className="my-6 border-t border-white mx-4" />
          <div className="flex-1 items-center justify-center p-4">
            <h1 className="text-center font-bold text-lg">
              Versão {versoes[0].numero}
            </h1>
          </div>
        </div>
      </aside>

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
    </>
  );
}
