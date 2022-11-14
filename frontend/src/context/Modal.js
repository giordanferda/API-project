import React, { useContext, useRef, useState, useEffect } from "react";
import ReactDOM from "react-dom";
import "./Modal.css";

const ModalContext = React.createContext();
export const useModalContext = () => useContext(ModalContext);

export function ModalProvider({ children }) {
  const modalRef = useRef();
  const [value, setValue] = useState();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [searchToggle, setSearchToggle] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    setValue(modalRef.current);
  }, []);

  return (
    <>
      <ModalContext.Provider
        value={{
          value,
          searchToggle,
          setSearchToggle,
          userSearch,
          setUserSearch,
          showLoginModal,
          setShowLoginModal,
        }}
      >
        {children}
      </ModalContext.Provider>
      <div ref={modalRef} />
    </>
  );
}

export function Modal({ onClose, children }) {
  const modalNode = useContext(ModalContext);
  if (!modalNode) return null;

  return ReactDOM.createPortal(
    <div id="modal">
      <div id="modal-background" onClick={onClose} />
      <div id="modal-content">{children}</div>
    </div>,
    document.getElementById("modal-root")
    // modalNode
  );
}
