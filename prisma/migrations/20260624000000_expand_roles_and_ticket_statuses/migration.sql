-- AlterEnum: add Faculty, Maintenance Supervisor, and Event Organizer roles
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'FACULTY';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MAINTENANCE_SUPERVISOR';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'EVENT_ORGANIZER';

-- AlterEnum: add Assigned and Waiting ticket statuses (MNT-4, MNT-6)
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'ASSIGNED';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'WAITING';
