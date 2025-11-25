import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { sql } from "drizzle-orm";


neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

// Asegurar que las tablas existen al inicializar
async function ensureTablesExist() {
  try {
    // Añadir columnas de consentimiento si no existen (una por una para evitar errores)
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS family_consent boolean DEFAULT false;
    `);
    
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS personal_consent boolean DEFAULT false;
    `);

    // Crear tabla municipalities primero si no existe
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS municipalities (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL UNIQUE,
        photo_url text,
        description text,
        is_active boolean DEFAULT true,
        created_at timestamp with time zone DEFAULT now()
      );
    `);

    // Verificar y añadir columna municipality_id si no existe
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'municipality_id'
        ) THEN
          ALTER TABLE users ADD COLUMN municipality_id varchar;
        END IF;
      END $$;
    `);
    
    // Añadir la foreign key constraint si no existe
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'users_municipality_id_fkey'
        ) THEN
          ALTER TABLE users 
          ADD CONSTRAINT users_municipality_id_fkey 
          FOREIGN KEY (municipality_id) REFERENCES municipalities(id);
        END IF;
      END $$;
    `);

    // Verificar y crear tabla activities si no existe
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS activities (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL REFERENCES users(id),
        activity_type varchar NOT NULL,
        description text NOT NULL,
        metadata jsonb,
        created_at timestamp with time zone DEFAULT now()
      );
    `);

    // Verificar y crear tabla program_activities si no existe
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS program_activities (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        professional_id varchar NOT NULL REFERENCES users(id),
        title text NOT NULL,
        description text NOT NULL,
        activity_type text NOT NULL,
        instructions text,
        difficulty text DEFAULT 'medium',
        assigned_users integer DEFAULT 0,
        is_active boolean DEFAULT true,
        created_at timestamp with time zone DEFAULT now()
      );
    `);

    // Crear tabla professional_assignments con estructura correcta si no existe
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS professional_assignments (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        professional_id varchar NOT NULL REFERENCES users(id),
        elderly_user_id varchar NOT NULL REFERENCES users(id),
        municipality_id varchar REFERENCES municipalities(id),
        organization text,
        specialization text,
        can_view_full_profile boolean DEFAULT true,
        can_manage_all_reminders boolean DEFAULT true,
        can_receive_critical_alerts boolean DEFAULT true,
        is_active boolean DEFAULT true,
        assigned_by varchar REFERENCES users(id),
        created_at timestamp with time zone DEFAULT now(),
        UNIQUE(professional_id, elderly_user_id)
      );
    `);

    // Crear el municipio "Cabeza la Vaca" si no existe
    await db.execute(sql`
      INSERT INTO municipalities (id, name, photo_url, is_active)
      VALUES ('cabeza-la-vaca', 'Cabeza la Vaca', '/Cabeza la Vaca.jpg', true)
      ON CONFLICT (name) DO NOTHING;
    `);

    console.log("Database tables verified/created successfully");
  } catch (error) {
    console.error("Error ensuring tables exist:", error);
  }
}

// Ejecutar al importar el módulo
ensureTablesExist();