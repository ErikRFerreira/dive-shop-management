import { PreferredLanguage } from '../src/generated/prisma/enums';

import type { DemoCustomerSeed } from './seed-types';

export const demoCustomers = [
  {
    key: 'sofia-reyes',
    profile: { fullName: 'Sofia Reyes', firstName: 'Sofia', lastName: 'Reyes', whatsAppNumber: '+63 917 482 1036', email: 'sofia.reyes@example.com', hotel: 'Ocean Vida Resort', preferredLanguage: PreferredLanguage.ENGLISH, notes: 'Returning guest; prefers small dive groups.' },
    diving: { certificationAgency: 'PADI', certificationLevel: 'Advanced Open Water', lastDiveOffset: -32, divesLogged: 68, heightCm: 163, weightKg: 56, shoeSize: 38, equipmentNeeded: 'BCD size S and regulator' },
  },
  {
    key: 'mateo-santos',
    profile: { fullName: 'Mateo Santos', firstName: 'Mateo', lastName: 'Santos', whatsAppNumber: '+63 918 713 2485', email: 'mateo.santos@example.com', preferredLanguage: PreferredLanguage.ENGLISH },
    diving: { certificationAgency: 'SSI', certificationLevel: 'Advanced Adventurer', lastDiveOffset: -45, divesLogged: 91, heightCm: 176, weightKg: 74, shoeSize: 42 },
  },
  {
    key: 'li-wei',
    profile: { fullName: 'Wei Li', firstName: 'Wei', lastName: 'Li', chineseName: '李伟', weChatId: 'liwei_dives', email: 'wei.li@example.cn', hotel: 'Slam’s Garden Resort', preferredLanguage: PreferredLanguage.CHINESE },
    diving: { certificationAgency: 'PADI', certificationLevel: 'Open Water', lastDiveOffset: -120, divesLogged: 14, heightCm: 172, weightKg: 68, shoeSize: 42, equipmentNeeded: 'Full equipment, 3 mm wetsuit' },
  },
  {
    key: 'chen-yu',
    profile: { fullName: 'Yu Chen', firstName: 'Yu', lastName: 'Chen', chineseName: '陈宇', weChatId: 'chenyu_blue', phone: '+86 138 2468 3157', hotel: 'Tepanee Beach Resort', preferredLanguage: PreferredLanguage.CHINESE },
  },
  {
    key: 'zhang-min',
    profile: { fullName: 'Min Zhang', firstName: 'Min', lastName: 'Zhang', chineseName: '张敏', weChatId: 'minzhang_sea', email: 'min.zhang@example.cn', hotel: 'Tepanee Beach Resort', preferredLanguage: PreferredLanguage.CHINESE },
  },
  {
    key: 'emma-wilson',
    profile: { fullName: 'Emma Wilson', firstName: 'Emma', lastName: 'Wilson', whatsAppNumber: '+44 7700 900321', email: 'emma.wilson@example.co.uk', hotel: 'Buena Vida Resort', preferredLanguage: PreferredLanguage.ENGLISH },
  },
  {
    key: 'liam-wilson',
    profile: { fullName: 'Liam Wilson', firstName: 'Liam', lastName: 'Wilson', whatsAppNumber: '+44 7700 900322', hotel: 'Buena Vida Resort', preferredLanguage: PreferredLanguage.ENGLISH },
  },
  {
    key: 'lucia-bianchi',
    profile: { fullName: 'Lucia Bianchi', firstName: 'Lucia', lastName: 'Bianchi', whatsAppNumber: '+39 320 555 0184', email: 'lucia.bianchi@example.it', hotel: 'Evolution Dive Resort', preferredLanguage: PreferredLanguage.ENGLISH },
    diving: { certificationAgency: 'PADI', certificationLevel: 'Rescue Diver', lastDiveOffset: -18, divesLogged: 127, heightCm: 168, weightKg: 60, shoeSize: 39 },
  },
  {
    key: 'noah-fischer',
    profile: { fullName: 'Noah Fischer', firstName: 'Noah', lastName: 'Fischer', whatsAppNumber: '+49 151 234 8871', email: 'noah.fischer@example.de', hotel: 'Hippocampus Beach Resort', preferredLanguage: PreferredLanguage.ENGLISH },
    diving: { certificationAgency: 'SSI', certificationLevel: 'Open Water Diver', lastDiveOffset: -210, divesLogged: 22, heightCm: 181, weightKg: 79, shoeSize: 44, equipmentNeeded: 'BCD size L; owns mask and computer' },
  },
  {
    key: 'aisha-rahman',
    profile: { fullName: 'Aisha Rahman', firstName: 'Aisha', lastName: 'Rahman', whatsAppNumber: '+65 8123 7741', email: 'aisha.rahman@example.sg', hotel: 'Kokays Maldito', preferredLanguage: PreferredLanguage.ENGLISH },
    diving: { certificationAgency: 'PADI', certificationLevel: 'Advanced Open Water', lastDiveOffset: -63, divesLogged: 47, heightCm: 160, weightKg: 53, shoeSize: 37 },
  },
  {
    key: 'daniel-tan',
    profile: { fullName: 'Daniel Tan', firstName: 'Daniel', lastName: 'Tan', whatsAppNumber: '+65 9234 6632', email: 'daniel.tan@example.sg', preferredLanguage: PreferredLanguage.ENGLISH },
    diving: { certificationAgency: 'PADI', certificationLevel: 'Open Water', lastDiveOffset: -95, divesLogged: 19, heightCm: 174, weightKg: 70, shoeSize: 42 },
  },
  {
    key: 'mei-lin-tan',
    profile: { fullName: 'Mei Lin Tan', firstName: 'Mei Lin', lastName: 'Tan', chineseName: '陈美玲', weChatId: 'meilintan', whatsAppNumber: '+65 9234 6633', preferredLanguage: PreferredLanguage.CHINESE },
    diving: { certificationAgency: 'PADI', certificationLevel: 'Open Water', lastDiveOffset: -95, divesLogged: 18, heightCm: 158, weightKg: 51, shoeSize: 37 },
  },
  {
    key: 'haruto-sato',
    profile: { fullName: 'Haruto Sato', firstName: 'Haruto', lastName: 'Sato', email: 'haruto.sato@example.jp', hotel: 'Angelina Beach Resort', preferredLanguage: PreferredLanguage.OTHER },
    diving: { certificationAgency: 'PADI', certificationLevel: 'Advanced Open Water', lastDiveOffset: -12, divesLogged: 56, heightCm: 170, weightKg: 64, shoeSize: 41 },
  },
  {
    key: 'olivia-martin',
    profile: { fullName: 'Olivia Martin', firstName: 'Olivia', lastName: 'Martin', whatsAppNumber: '+33 6 12 34 56 91', email: 'olivia.martin@example.fr', hotel: 'Little Mermaid Dive Resort', preferredLanguage: PreferredLanguage.ENGLISH },
  },
  {
    key: 'ethan-martin',
    profile: { fullName: 'Ethan Martin', firstName: 'Ethan', lastName: 'Martin', whatsAppNumber: '+33 6 12 34 56 92', hotel: 'Little Mermaid Dive Resort', preferredLanguage: PreferredLanguage.ENGLISH },
  },
  {
    key: 'maria-garcia',
    profile: { fullName: 'María García', firstName: 'María', lastName: 'García', whatsAppNumber: '+34 612 778 401', email: 'maria.garcia@example.es', hotel: 'Blue Corals Beach Resort', preferredLanguage: PreferredLanguage.ENGLISH },
    diving: { certificationAgency: 'PADI', certificationLevel: 'Divemaster', lastDiveOffset: -7, divesLogged: 244, heightCm: 166, weightKg: 59, shoeSize: 39 },
  },
  {
    key: 'jack-thompson',
    profile: { fullName: 'Jack Thompson', firstName: 'Jack', lastName: 'Thompson', whatsAppNumber: '+61 412 881 740', email: 'jack.thompson@example.au', hotel: 'Ocean Vida Resort', preferredLanguage: PreferredLanguage.ENGLISH },
    diving: { certificationAgency: 'SSI', certificationLevel: 'Advanced Adventurer', lastDiveOffset: -28, divesLogged: 73, heightCm: 184, weightKg: 84, shoeSize: 45, equipmentNeeded: '15 L tank and BCD size XL' },
  },
  {
    key: 'priya-nair',
    profile: { fullName: 'Priya Nair', firstName: 'Priya', lastName: 'Nair', whatsAppNumber: '+91 98765 43218', email: 'priya.nair@example.in', hotel: 'Malapascua Garden Resort', preferredLanguage: PreferredLanguage.ENGLISH },
    diving: { certificationAgency: 'PADI', certificationLevel: 'Open Water', lastDiveOffset: -160, divesLogged: 11, heightCm: 157, weightKg: 50, shoeSize: 36, equipmentNeeded: 'Full equipment, prescription mask if available' },
  },
  {
    key: 'alex-kim',
    profile: { fullName: 'Alex Kim', firstName: 'Alex', lastName: 'Kim', whatsAppNumber: '+82 10 8841 2250', email: 'alex.kim@example.kr', hotel: 'Hippocampus Beach Resort', preferredLanguage: PreferredLanguage.ENGLISH },
    diving: { certificationAgency: 'PADI', certificationLevel: 'Open Water', lastDiveOffset: -400, divesLogged: 8, heightCm: 175, weightKg: 71, shoeSize: 42 },
  },
  {
    key: 'nora-jensen',
    profile: { fullName: 'Nora Jensen', firstName: 'Nora', lastName: 'Jensen', whatsAppNumber: '+45 20 44 81 73', email: 'nora.jensen@example.dk', hotel: 'Buena Vida Resort', preferredLanguage: PreferredLanguage.ENGLISH },
    diving: { certificationAgency: 'PADI', certificationLevel: 'Advanced Open Water', lastDiveOffset: -38, divesLogged: 39, heightCm: 169, weightKg: 62, shoeSize: 40 },
  },
  {
    key: 'samir-patel',
    profile: { fullName: 'Samir Patel', firstName: 'Samir', lastName: 'Patel', whatsAppNumber: '+1 604 555 0147', email: 'samir.patel@example.ca', hotel: 'Tepanee Beach Resort', preferredLanguage: PreferredLanguage.ENGLISH },
  },
  {
    key: 'isabella-rossi',
    profile: { fullName: 'Isabella Rossi', firstName: 'Isabella', lastName: 'Rossi', whatsAppNumber: '+39 333 681 9120', email: 'isabella.rossi@example.it', preferredLanguage: PreferredLanguage.ENGLISH },
    diving: { certificationAgency: 'PADI', certificationLevel: 'Rescue Diver', lastDiveOffset: -22, divesLogged: 112, heightCm: 165, weightKg: 57, shoeSize: 38 },
  },
  {
    key: 'ben-carter',
    profile: { fullName: 'Ben Carter', firstName: 'Ben', lastName: 'Carter', whatsAppNumber: '+1 415 555 0172', email: 'ben.carter@example.com', hotel: 'Slam’s Garden Resort', preferredLanguage: PreferredLanguage.ENGLISH },
    diving: { certificationAgency: 'NAUI', certificationLevel: 'Scuba Diver', lastDiveOffset: -620, divesLogged: 6, heightCm: 178, weightKg: 76, shoeSize: 43, equipmentNeeded: 'Full equipment' },
  },
  {
    key: 'grace-ong',
    profile: { fullName: 'Grace Ong', firstName: 'Grace', lastName: 'Ong', chineseName: '王恩慧', whatsAppNumber: '+65 8111 9073', email: 'grace.ong@example.sg', preferredLanguage: PreferredLanguage.ENGLISH },
    diving: { certificationAgency: 'PADI', certificationLevel: 'Open Water', lastDiveOffset: -84, divesLogged: 16, heightCm: 162, weightKg: 54, shoeSize: 37 },
  },
  {
    key: 'kai-ong',
    profile: { fullName: 'Kai Ong', firstName: 'Kai', lastName: 'Ong', chineseName: '王凯', whatsAppNumber: '+65 8111 9074', preferredLanguage: PreferredLanguage.CHINESE },
  },
  {
    key: 'ella-ong',
    profile: { fullName: 'Ella Ong', firstName: 'Ella', lastName: 'Ong', whatsAppNumber: '+65 8111 9075', preferredLanguage: PreferredLanguage.ENGLISH },
  },
  {
    key: 'tom-ong',
    profile: { fullName: 'Tom Ong', firstName: 'Tom', lastName: 'Ong', whatsAppNumber: '+65 8111 9076', preferredLanguage: PreferredLanguage.ENGLISH },
  },
  {
    key: 'yuki-nakamura',
    profile: { fullName: 'Yuki Nakamura', firstName: 'Yuki', lastName: 'Nakamura', email: 'yuki.nakamura@example.jp', hotel: 'Evolution Dive Resort', preferredLanguage: PreferredLanguage.OTHER },
    diving: { certificationAgency: 'PADI', certificationLevel: 'Advanced Open Water', lastDiveOffset: -51, divesLogged: 64, heightCm: 161, weightKg: 52, shoeSize: 37 },
  },
  {
    key: 'felix-muller',
    profile: { fullName: 'Felix Müller', firstName: 'Felix', lastName: 'Müller', whatsAppNumber: '+49 176 555 9012', email: 'felix.mueller@example.de', hotel: 'Angelina Beach Resort', preferredLanguage: PreferredLanguage.ENGLISH },
    diving: { certificationAgency: 'SSI', certificationLevel: 'Advanced Adventurer', lastDiveOffset: -26, divesLogged: 82, heightCm: 180, weightKg: 80, shoeSize: 44 },
  },
  {
    key: 'chloe-dubois',
    profile: { fullName: 'Chloé Dubois', firstName: 'Chloé', lastName: 'Dubois', whatsAppNumber: '+33 6 55 80 12 44', email: 'chloe.dubois@example.fr', hotel: 'Blue Corals Beach Resort', preferredLanguage: PreferredLanguage.ENGLISH },
  },
  {
    key: 'owen-brooks',
    profile: { fullName: 'Owen Brooks', firstName: 'Owen', lastName: 'Brooks', email: 'owen.brooks@example.com', preferredLanguage: PreferredLanguage.ENGLISH },
    diving: { certificationAgency: 'PADI', certificationLevel: 'Advanced Open Water', lastDiveOffset: -76, divesLogged: 34, heightCm: 183, weightKg: 82, shoeSize: 44 },
  },
] satisfies DemoCustomerSeed[];
