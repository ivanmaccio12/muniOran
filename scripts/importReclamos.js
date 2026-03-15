import fs from 'fs';
import csv from 'csv-parser';
import { pool, initDB } from '../src/services/dbService.js';

const csvFilePath = 'C:\\Users\\andre\\Downloads\\Formulario de reclamos Municipalidad Oran (respuestas) - Respuestas de formulario 1.csv';

const importCSV = async () => {
    try {
        await initDB();
        console.log('--- Iniciando Importación de Reclamos ---');

        const results = [];
        let skipped = 0;

        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                console.log(`Leídas ${results.length} filas del CSV. Insertando en la BD...`);

                for (const row of results) {
                    try {
                        // Limpieza de keys por posibles problemas de encoding o espacios
                        const getVal = (keyPart) => {
                            const key = Object.keys(row).find(k => k.includes(keyPart));
                            return key ? row[key] : null;
                        };

                        const timestampStr = getVal('Timestamp') || new Date().toISOString();
                        const nombre_apellido = getVal('Ingrese nombre y apellido') || 'Desconocido';
                        const dni = getVal('Ingrese DNI') || '0';
                        const motivo = getVal('Motivo') || 'Sin categorizar';
                        // Handle "Ingrese una descripción" or "Comentario" based on headers
                        const descripcion = getVal('descripc') || getVal('Descrip') || getVal('Comentario') || '-';
                        const direccion = getVal('Direcci') || '-';
                        const barrio = getVal('Barrio') || null;
                        const coordenadas = getVal('Coordenadas') || null;
                        const estado = getVal('Estado de caso') || 'Nuevo';

                        // Check if it's an empty row
                        if (!row || Object.keys(row).length < 3) {
                            skipped++;
                            continue;
                        }

                        // Formatear timestamp de Google Forms (m/d/yyyy H:M:S) a algo que Postgres entienda
                        // O simplemente dejar que postgres determine o pasar a objeto Date
                        let parsedDate = timestampStr;
                        if(parsedDate.includes('/')){
                            const parts = parsedDate.split(/[\s/:]/);
                            if(parts.length >= 6){
                                // usually m/d/yyyy
                                parsedDate = new Date(`${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}T${parts[3]}:${parts[4]}:${parts[5]}Z`);
                            }
                        }

                        let ts;
                        try {
                            ts = new Date(parsedDate);
                            if(isNaN(ts)) ts = new Date();
                        } catch(e) { ts = new Date(); }

                        await pool.query(
                            `INSERT INTO reclamos 
                            (timestamp, nombre_apellido, dni, telefono, motivo, descripcion, direccion, barrio, coordenadas, estado) 
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                            [
                                ts,
                                nombre_apellido,
                                dni,
                                'Importado CSV', // Telefono no viene en el form, ponemos filler
                                motivo,
                                descripcion,
                                direccion,
                                barrio,
                                coordenadas,
                                estado
                            ]
                        );
                    } catch (err) {
                        console.error('Error insertando fila:', err, row);
                    }
                }

                console.log(`✅ Importación finalizada. Filas insertadas: ${results.length - skipped}`);
                process.exit(0);
            });

    } catch (error) {
        console.error('❌ Error fatal en la importación:', error);
        process.exit(1);
    }
};

importCSV();
