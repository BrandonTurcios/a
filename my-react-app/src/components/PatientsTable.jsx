import { useState, useEffect } from 'react';
import trytonService from '../services/trytonService';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

const PatientsTable = ({ sessionData }) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Restaurar sesión en el servicio
      trytonService.restoreSession(sessionData);
      
      const patientsData = await trytonService.getPatientsSafe();
      setPatients(patientsData);
    } catch (err) {
      console.error('Error cargando pacientes:', err);
      setError('Error cargando pacientes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateObj) => {
    if (!dateObj) return 'N/A';
    
    try {
      if (typeof dateObj === 'object' && dateObj.__class__ === 'date') {
        return `${dateObj.day}/${dateObj.month}/${dateObj.year}`;
      } else if (typeof dateObj === 'string') {
        return new Date(dateObj).toLocaleDateString();
      }
      return 'N/A';
    } catch (error) {
      return 'N/A';
    }
  };

  const formatGender = (gender) => {
    const genderMap = {
      'm': 'Masculino',
      'f': 'Femenino',
      'm-f': 'Masculino -> Femenino',
      'f-m': 'Femenino -> Masculino'
    };
    return genderMap[gender] || gender || 'N/A';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando pacientes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadPatients}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Pacientes</h2>
        <button
          onClick={loadPatients}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Actualizar
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
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
                      <div className="font-medium">
                        {patient.rec_name || 'Sin nombre'}
                      </div>
                      {patient.lastname && patient.lastname !== patient.rec_name && !patient.rec_name?.includes(patient.lastname) && (
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
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                      {patient.puid || 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">
                      {patient.age || 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">
                      {formatGender(patient.gender)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        patient.deceased 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {patient.deceased ? 'Fallecido' : 'Vivo'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        patient.patient_status 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {patient.patient_status ? 'Activo' : 'Inactivo'}
                      </span>
                      {patient.active !== undefined && !patient.active && (
                        <div className="text-xs text-gray-500">
                          Inactivo
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-xs">
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
      </div>

      {/* Footer con estadísticas */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <strong>Total de pacientes:</strong> {patients.length}
            {patients.length > 0 && (
              <span className="ml-4">
                <strong>Vivos:</strong> {patients.filter(p => !p.deceased).length} | 
                <strong> Fallecidos:</strong> {patients.filter(p => p.deceased).length} | 
                <strong> Activos:</strong> {patients.filter(p => p.patient_status).length}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientsTable;
