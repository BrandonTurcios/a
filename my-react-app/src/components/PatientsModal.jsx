import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import trytonService from '../services/trytonService';

const PatientsModal = ({ isOpen, onClose, sessionData }) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && sessionData) {
      loadPatients();
    }
  }, [isOpen, sessionData]);

  const loadPatients = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('=== CARGANDO PACIENTES EN MODAL ===');
      trytonService.restoreSession(sessionData);
      
      const patientsData = await trytonService.getPatientsSafe({
        limit: 20,
        computeAge: true
      });
      
      console.log('Pacientes cargados en modal:', patientsData);
      setPatients(patientsData);
    } catch (error) {
      console.error('Error cargando pacientes en modal:', error);
      setError('Error cargando pacientes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateObj) => {
    if (!dateObj) return 'N/A';
    
    try {
      // Manejar fechas que vienen como objetos de Tryton
      if (typeof dateObj === 'object' && dateObj.__class__ === 'date') {
        const date = new Date(dateObj.year, dateObj.month - 1, dateObj.day);
        return date.toLocaleDateString();
      } else if (typeof dateObj === 'string') {
        return new Date(dateObj).toLocaleDateString();
      }
      return 'N/A';
    } catch {
      return 'N/A';
    }
  };

  const formatGender = (gender) => {
    if (!gender) return 'N/A';
    const genderMap = {
      'm': 'Masculino',
      'f': 'Femenino',
      'm-f': 'Masculino -> Femenino',
      'f-m': 'Femenino -> Masculino'
    };
    return genderMap[gender] || gender;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span className="text-2xl">🏥</span>
            <span>Pacientes de GNU Health</span>
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Lista completa de pacientes del sistema GNU Health con información detallada
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Cargando pacientes...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
            <button
              onClick={loadPatients}
              className="mt-2 text-sm text-red-800 underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && patients.length > 0 && (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead>PUID</TableHead>
                  <TableHead>Edad</TableHead>
                  <TableHead>Género</TableHead>
                  <TableHead>Estado Vital</TableHead>
                  <TableHead>Estado del Paciente</TableHead>
                  <TableHead>Información Adicional</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">{patient.id}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-gray-800 text-sm">
                          {patient.rec_name || 'Sin nombre'}
                        </div>
                        {patient.lastname && patient.lastname !== patient.rec_name && (
                          <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                            Apellido: {patient.lastname}
                          </div>
                        )}
                        {patient['party.rec_name'] && patient['party.rec_name'] !== patient.rec_name && (
                          <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            Party: {patient['party.rec_name']}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm bg-gray-50 px-2 py-1 rounded">
                        {patient.puid || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {patient.age || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {formatGender(patient.gender)}
                        </div>
                        {patient['gender:string'] && (
                          <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                            {patient['gender:string']}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          patient.deceased === true
                            ? 'bg-red-100 text-red-800' 
                            : patient.deceased === false
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {patient.deceased === true ? 'Fallecido' : 
                           patient.deceased === false ? 'Vivo' : 'Desconocido'}
                        </span>
                        {patient.deceased === true && (
                          <div className="text-xs text-red-600">
                            ⚠️ Paciente fallecido
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          patient.patient_status === true
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {patient.patient_status === true ? 'Activo' : 'Inactivo'}
                        </span>
                        <div className="text-xs text-gray-500">
                          Party ID: {patient.party}
                        </div>
                        {patient.active !== undefined && (
                          <div className="text-xs text-gray-500">
                            Active: {patient.active ? 'Sí' : 'No'}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <div className="text-gray-600">
                          <strong>ID:</strong> {patient.id}
                        </div>
                        <div className="text-gray-600">
                          <strong>Party:</strong> {patient.party}
                        </div>
                        {patient._timestamp && (
                          <div className="text-gray-500">
                            <strong>Última modificación:</strong><br/>
                            {new Date(parseFloat(patient._timestamp) * 1000).toLocaleString()}
                          </div>
                        )}
                        <div className="flex space-x-1 mt-1">
                          {patient._write && (
                            <span className="px-1 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                              W
                            </span>
                          )}
                          {patient._delete && (
                            <span className="px-1 py-0.5 bg-red-100 text-red-800 rounded text-xs">
                              D
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && !error && patients.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No se encontraron pacientes
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-600 space-y-1">
            <div className="font-medium">
              📊 {patients.length} pacientes encontrados
            </div>
            <div className="text-xs text-gray-500">
              {patients.filter(p => p.deceased === false).length} vivos • 
              {patients.filter(p => p.deceased === true).length} fallecidos • 
              {patients.filter(p => p.patient_status === true).length} activos
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={loadPatients}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              🔄 Actualizar
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PatientsModal;
