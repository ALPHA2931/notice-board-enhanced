-- Initialize notice board database
-- This script runs automatically when the PostgreSQL container starts

-- Create the notice_board database if it doesn't exist
SELECT 'CREATE DATABASE notice_board'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'notice_board');
