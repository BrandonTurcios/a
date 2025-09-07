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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const formatGender = (gender) => {
    if (!gender) return 'N/A';
    const genderMap = {
      'M': 'Masculino',
      'F': 'Femenino',
      'Other': 'Otro'
    };
    return genderMap[gender] || gender;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pacientes de GNU Health</DialogTitle>
          <DialogDescription>
            Lista de pacientes obtenidos del sistema GNU Health
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
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Género</TableHead>
                  <TableHead>Fecha de Nacimiento</TableHead>
                  <TableHead>Edad</TableHead>
                  <TableHead>PUID</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Documento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">{patient.id}</TableCell>
                    <TableCell>{patient.name || 'N/A'}</TableCell>
                    <TableCell>{formatGender(patient.sex)}</TableCell>
                    <TableCell>{formatDate(patient.birth_date || patient.dob)}</TableCell>
                    <TableCell>
                      {patient.age !== null ? `${patient.age} años` : 'N/A'}
                    </TableCell>
                    <TableCell>{patient.puid || 'N/A'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        patient.deceased 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {patient.deceased ? 'Fallecido' : 'Vivo'}
                      </span>
                    </TableCell>
                    <TableCell>{patient.identification_code || 'N/A'}</TableCell>
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
