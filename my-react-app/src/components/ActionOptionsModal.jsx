import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

const ActionOptionsModal = ({ 
  isOpen, 
  onClose, 
  options = [], 
  onSelectOption,
  title = "Seleccionar Acción",
  description = "Este menú tiene múltiples opciones disponibles. Selecciona una para continuar:"
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleSelect = () => {
    if (onSelectOption && options[selectedIndex]) {
      onSelectOption(selectedIndex, options[selectedIndex]);
    }
    onClose();
  };

  const handleCancel = () => {
    setSelectedIndex(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {options.map((option, index) => (
            <div
              key={option.id || index}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedIndex === index
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
              }`}
              onClick={() => setSelectedIndex(index)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {option.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {option.description || `${option.name} (${option.resModel})`}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>Modelo: {option.resModel}</span>
                    {option.contextModel && (
                      <span>Contexto: {option.contextModel}</span>
                    )}
                    {option.views && option.views.length > 0 && (
                      <span>Vistas: {option.views.length}</span>
                    )}
                  </div>
                </div>
                <div className="ml-4">
                  <input
                    type="radio"
                    checked={selectedIndex === index}
                    onChange={() => setSelectedIndex(index)}
                    className="w-4 h-4 text-blue-600"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleSelect}
            disabled={options.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Seleccionar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActionOptionsModal;
