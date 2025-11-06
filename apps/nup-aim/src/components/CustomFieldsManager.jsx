import React from 'react';
import { X } from 'lucide-react';

// This is a placeholder component that will be implemented later
export const CustomFieldsManager = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Campos Personalizados</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <p className="text-gray-700">
            Esta funcionalidade será implementada em breve. Ela permitirá a criação e gerenciamento de campos personalizados para as análises de impacto.
          </p>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Funcionalidades Planejadas:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Criar campos personalizados para cada seção da análise</li>
              <li>• Definir tipos de campo (texto, número, data, seleção, etc.)</li>
              <li>• Configurar validações e regras de preenchimento</li>
              <li>• Organizar campos em seções e definir ordem</li>
              <li>• Exportar dados de campos personalizados</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};