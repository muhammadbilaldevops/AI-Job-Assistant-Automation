# Supabase integration

This folder contains the database migrations and edge worker used for private workspace data and scheduled discovery. Row Level Security scopes records to the signed-in owner. The worker accepts a hashed private key from Make, collects approved public feeds and writes normalized listings; it does not handle Indeed credentials.
