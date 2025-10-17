import { useState } from 'react';
import trytonService from '../../services/trytonService';

/**
 * Hook para manejar el modal de opciones de acción
 */
export const useActionOptions = () => {
  const [showModal, setShowModal] = useState(false);
  const [options, setOptions] = useState([]);
  const [pendingMenuItem, setPendingMenuItem] = useState(null);

  const showActionOptions = (actionInfo, menuItem) => {
    setOptions(actionInfo.options || []);
    setPendingMenuItem(menuItem);
    setShowModal(true);
  };

  const handleSelectOption = async (selectedOption) => {
    if (!pendingMenuItem) return;

    try {
      // Ejecutar la opción seleccionada
      const result = await trytonService.executeResModelOption(selectedOption);

      // Cerrar modal
      closeModal();

      return { success: true, result };
    } catch (error) {
      console.error('❌ Error ejecutando opción:', error);
      throw error;
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setOptions([]);
    setPendingMenuItem(null);
  };

  return {
    showModal,
    options,
    pendingMenuItem,
    showActionOptions,
    handleSelectOption,
    closeModal
  };
};
