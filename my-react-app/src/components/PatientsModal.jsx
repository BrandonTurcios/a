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
          <DialogTitle>Pacientes</DialogTitle>
         
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
                  <TableHead>Nombre</TableHead>
                  <TableHead>PUID</TableHead>
                  <TableHead>Edad</TableHead>
                  <TableHead>Género</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Estado del Paciente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">{patient.id}</TableCell>
                    <TableCell>
                      <div className="font-medium text-gray-800">
                        {patient.rec_name || 'Sin nombre'}
                      </div>
                      {patient.lastname && patient.lastname !== patient.rec_name && (
                        <div className="text-xs text-gray-500">Apellido: {patient.lastname}</div>
                      )}
                      {patient['party.rec_name'] && patient['party.rec_name'] !== patient.rec_name && (
                        <div className="text-xs text-blue-600">Party: {patient['party.rec_name']}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{patient.puid || 'N/A'}</TableCell>
                    <TableCell>
                      {patient.age || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {formatGender(patient.gender)}
                      </div>
                      {patient['gender:string'] && (
                        <div className="text-xs text-gray-500">{patient['gender:string']}</div>
                      )}
                    </TableCell>
                    <TableCell>
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
          <div className="text-sm text-gray-600">
            {patients.length} pacientes encontrados
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PatientsModal;
