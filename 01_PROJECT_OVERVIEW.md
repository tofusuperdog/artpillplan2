# 01 — Project Overview

## Project Name

**ArtPillPlan v2**

## Tech Stack

- Next.js
- TypeScript
- Supabase
- Tailwind CSS
- Mobile-first responsive design

## Product Goal

ArtPillPlan v2 is a personal medication stock management web app.

The app helps the user answer these questions:

1. How many days can each medication still be taken?
2. Which medication is running low?
3. Which lot has expired?
4. Which lot is expiring soon?
5. When should the user buy or refill medication?
6. What is the average cost per pill and per standard box?
7. What is the recent stock history?

## Primary User

This app is designed for one personal user.

UX should focus on:

- Speed
- Simplicity
- Mobile-first usage
- Clear medication status
- Minimal unnecessary steps
- Low risk of missing important medication alerts

## Core Features

### PIN Login

- 4-digit PIN login
- No email/password
- Stay logged in until Logout
- Change PIN in Settings

### Home

- Medication cards
- Sorted by lowest remaining days first
- Each card shows medication name, remaining days, badges, and stock button

### Medication Detail

- Overall status
- Daily intake
- Cost
- Remaining lots
- Recent history

### Add Stock

- Creates a new lot every time
- Supports Total pills or Boxes
- Supports Total price or Price per box
- Expiry format: MM/YYYY
- Shows calculation preview before saving

### Recount Stock

- Used when actual counted stock differs from the system
- User enters total counted pills
- System adjusts lots automatically

### History

- Latest 30 stock records
- Filter by medication
- Only Add Stock and Recount Stock

### Settings

- Manage medications
- Manage alerts
- Change PIN
- Logout

## Visual Direction

Use attached UI reference images as the source of truth.

Style:

- Cream / Red Retro
- Warm cream background
- Ivory / beige cards
- Terracotta red primary actions
- Muted orange warnings
- Purple expired lot badges
- Green in-stock status
- Rounded retro panels
- Soft shadows
- Vintage handheld device mood
- Clean, readable, and production-ready

Avoid:

- Dark cyberpunk style
- Generic SaaS dashboard style
- Overly childish design
- Complex unnecessary animations
