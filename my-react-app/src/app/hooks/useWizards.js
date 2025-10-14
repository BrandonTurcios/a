import { useState } from 'react';
import trytonService from '../../services/trytonService';

/**
 * Hook para manejar wizards de Tryton
 */
export const useWizards = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [wizardInfo, setWizardInfo] = useState(null);
  const [wizardLoading, setWizardLoading] = useState(false);

  const handleWizardAction = async (wizardName, actionName) => {
    try {
      setWizardLoading(true);

      const createResult = await trytonService.createWizard(wizardName);
      const wizardForm = await trytonService.getWizardForm(wizardName, createResult.wizardId);

      const wizardModalInfo = {
        ...wizardForm,
        wizardName,
        wizardId: createResult.wizardId,
        title: actionName || 'Wizard'
      };

      setWizardInfo(wizardModalInfo);
      setShowWizard(true);
      setWizardLoading(false);
    } catch (error) {
      console.error('Error manejando wizard:', error);
      setWizardInfo({
        wizardName,
        error: error.message || 'Error desconocido'
      });
      setShowWizard(true);
      setWizardLoading(false);
    }
  };

  const handleWizardSubmit = async (values, buttonState) => {
    if (!wizardInfo) return;

    try {
      setWizardLoading(true);

      const result = await trytonService.executeWizardAction(
        wizardInfo.wizardName,
        wizardInfo.wizardId,
        values,
        buttonState
      );

      // Si el resultado indica éxito, cerrar el wizard
      if (result && result.type === 'success') {
        await closeWizard();
        return { success: true };
      }

      return { success: false, result };
    } catch (error) {
      console.error('❌ Error ejecutando wizard:', error);
      throw error;
    } finally {
      setWizardLoading(false);
    }
  };

  const handleWizardCancel = async () => {
    await closeWizard();
  };

  const closeWizard = async () => {
    if (wizardInfo) {
      try {
        await trytonService.deleteWizard(
          wizardInfo.wizardName,
          wizardInfo.wizardId
        );
      } catch (error) {
        console.warn('⚠️ Error eliminando wizard:', error);
      }
    }

    setShowWizard(false);
    setWizardInfo(null);
  };

  return {
    showWizard,
    wizardInfo,
    wizardLoading,
    handleWizardAction,
    handleWizardSubmit,
    handleWizardCancel,
    closeWizard
  };
};
