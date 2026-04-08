import dotenv from 'dotenv'
import pg from 'pg';
dotenv.config()

const { Pool } = pg;
const pool = new Pool({
   connectionString: `${process.env.DB_URL}`
});

const initializeDatabase = async () => {
   console.log('Initializing kittens database...');

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS kittens (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,              
    breed TEXT,        
    color TEXT,       
    fur_type TEXT,            
    energy_level INTEGER,                
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
   `;

   try {
      const client = await pool.connect();
      await pool.query(createTableQuery);
      console.log('The kittens table is ready to go.');
   } catch (error) {
      console.error('Error initializing database:', error.message);
      console.error('Full error:', error);
      throw error;
   }
};

async function addKitten(name, breed, color, furType, energyLevel) {

   const validBreeds = ['persian', 'siamese', 'british'];
   if (!validBreeds.includes(breed.toLowerCase())) {
      console.error(`Помилка: breed має бути одним з: ${validBreeds.join(', ')}`);
      return;
   }

   const validFurTypes = ['short', 'long'];
   if (!validFurTypes.includes(furType.toLowerCase())) {
      console.error(`Помилка: fur_type має бути одним з: ${validFurTypes.join(', ')}`);
      return;
   }

   if (energyLevel < 1 || energyLevel > 3) {
      console.error('Помилка: energy_level має бути від 1 до 3');
      return;
   }

   const query = `
        INSERT INTO kittens (
            name, breed, color, fur_type, energy_level
        ) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *`;

   const values = [name, breed, color, furType, energyLevel];

   try {
      const res = await pool.query(query, values);
      console.log('кошеня додано:', res.rows[0]);
   } catch (err) {
      console.error('Error:', err.message);
   }

}

async function getAllKittens() {
   const res = await pool.query('SELECT * FROM kittens');
   console.table(res.rows);
}

async function kittenExists(id) {
   const res = await pool.query('SELECT * FROM kittens WHERE id = $1', [id]);
   return res.rows.length > 0;
}

async function updateKittenEnergy(id, newEnergyLevel) {

   if (isNaN(id) || id <= 0) {
      console.error('Помилка: ID має бути додатним числом');
      return;
   }

   if (!(await kittenExists(id))) {
      console.error(`Помилка: Кошеня з ID ${id} не знайдено`);
      return;
   }

   if (newEnergyLevel < 1 || newEnergyLevel > 3) {
      console.error('Помилка: energy_level має бути від 1 до 3');
      return;
   }

   const query = 'UPDATE kittens SET energy_level = $1 WHERE id = $2 RETURNING *';
   const res = await pool.query(query, [newEnergyLevel, id]);
   console.log('котяча дата-база оновлена:', res.rows[0]);
}

async function deleteKitten(id) {

   if (isNaN(id) || id <= 0) {
      console.error('Помилка: ID має бути додатним числом');
      return;
   }

   if (!(await kittenExists(id))) {
      console.error(`Помилка: Кошеня з ID ${id} не знайдено`);
      return;
   }

   await pool.query('DELETE FROM kittens WHERE id = $1', [id]);
   console.log(`Кошеня з ID ${id} було видалено з бази даних..`);
}

(async () => {
   try {
      await initializeDatabase();

      switch(process.argv[2]) { 

         case "list": {
            await getAllKittens();
            break;
         }

         case "add": {

            if (process.argv.length < 8) {
               console.log("Usage: node db.js add <name> <breed> <color> <fur_type> <energy_level>");
               console.log("Example: node db.js add Barsik british grey short 3");
               break;
            }

             await addKitten(
               process.argv[3],
               process.argv[4],
               process.argv[5],
               process.argv[6],
               parseInt(process.argv[7])
            );
            break;
         }

         case "update": {

            if (process.argv.length < 5) {
               console.log("Usage: node db.js update <id> <energy_level>");
               break;
            }

            const id = parseInt(process.argv[3]);
            const energyLevel = parseInt(process.argv[4]);

            if (isNaN(id) || isNaN(energyLevel)) {
               console.log("Помилка: ID та energy_level мають бути числами");
               break;
            }

            await updateKittenEnergy(id, energyLevel);
            break;
         }

         case "delete": {

            if (process.argv.length < 4) {
               console.log("Usage: node db.js delete <id>");
               break;
            }

            const id = parseInt(process.argv[3]);

            if (isNaN(id)) {
               console.log("Помилка: ID має бути числом");
               break;
            }

            await deleteKitten(id);
            break;
         }

         case "help": {
            console.log("Доступні команди:");
            console.log("node db.js list - показати всіх кошенят");
            console.log("node db.js add <імя> <порода> <окрас> <тип_шерсті> <рівень_енергії>");
            console.log("node db.js update <id> <рівень_енергії> - оновити рівень енергії кошеняти");
            console.log("node db.js delete <id>");
            break;
         }

         default: {
            console.log("Usage: node db.js [list|add|update|delete|help]");
            console.log("Type 'node db.js help' for more information");
            break;
         }
      }

   } catch (err) {
      console.error("Error:", err.message);
   } finally {
      console.log('Завершення роботи з базою даних...');
      process.exit();
   }

})();