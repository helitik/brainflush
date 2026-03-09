export const en = {
  // Header
  'header.menu': 'Menu',
  'header.seedData': 'Seed test data',
  'header.backToBoard': 'Back to board',
  'header.archives': 'Archives',

  // Drawer
  'drawer.projects': 'Projects',
  'drawer.addProject': 'Add project',
  'drawer.seedData': 'Seed test data',
  'drawer.clearData': 'Clear all data',
  'drawer.clearDataConfirm': 'Delete ALL local data? This cannot be undone.',
  'drawer.archives': 'Archives',
  'drawer.themeLight': 'Theme: Light',
  'drawer.themeDark': 'Theme: Dark',
  'drawer.language': 'Language',

  // App / Lists
  'app.addList': 'Add list',

  // AddTaskSheet
  'addTask.title': 'Add a new task',
  'addTask.placeholder': "What's on your mind?",
  'addTask.submit': 'Add',

  // TaskInput
  'taskInput.placeholder': 'Add a task...',

  // TaskCard
  'taskCard.undo': 'Undo',
  'taskCard.archive': 'Archive',

  // TaskDetailModal
  'taskDetail.editTask': 'Edit task',
  'taskDetail.created': (date) => `Created ${date}`,
  'taskDetail.moveTo': 'Move to',
  'taskDetail.delete': 'Delete',
  'taskDetail.save': 'Save',
  'taskDetail.confirmTitle': 'Delete task?',
  'taskDetail.confirmMessage': 'This action cannot be undone.',

  // ArchiveView
  'archive.title': 'Archives',
  'archive.meta': (date, column) => `Archived ${date} \u00b7 from ${column}`,
  'archive.unknownList': 'Unknown list',
  'archive.restore': 'Restore',
  'archive.deletePermanently': 'Delete permanently',
  'archive.empty': 'No archived tasks',
  'archive.confirmTitle': 'Delete permanently?',
  'archive.confirmMessage': 'This action cannot be undone.',

  // TabEditor
  'tabEditor.newProject': 'New project',
  'tabEditor.editProject': 'Edit project',
  'tabEditor.placeholder': 'Project name',
  'tabEditor.confirmDelete': 'Confirm delete',
  'tabEditor.delete': 'Delete',
  'tabEditor.cancel': 'Cancel',
  'tabEditor.create': 'Create',
  'tabEditor.save': 'Save',

  // ListEditor
  'listEditor.title': 'New list',
  'listEditor.placeholder': 'List name',
  'listEditor.cancel': 'Cancel',
  'listEditor.add': 'Add',

  // ListHeader
  'listHeader.rename': 'Rename',
  'listHeader.moveLeft': 'Move left',
  'listHeader.moveRight': 'Move right',
  'listHeader.moveAllTasks': 'Move all tasks',
  'listHeader.delete': 'Delete',
  'listHeader.deleteTitle': 'Delete list',
  'listHeader.deleteConfirmPrefix': 'Delete',
  'listHeader.deleteConfirmSuffix': (count) => {
    if (count > 0) {
      return `and its ${count} task${count > 1 ? 's' : ''}? This cannot be undone.`
    }
    return '? This cannot be undone.'
  },
  'listHeader.cancel': 'Cancel',

  // List
  'list.noTasks': 'No tasks yet',
  'list.empty': 'This list is empty',
  'list.addTask': 'Add a task',

  // MoveTasksModal
  'moveTasks.title': 'Move all tasks to...',
  'moveTasks.project': 'Project',
  'moveTasks.list': 'List',
  'moveTasks.noLists': 'No other lists in this project',
  'moveTasks.cancel': 'Cancel',
  'moveTasks.submit': (count) => `Move ${count} task${count !== 1 ? 's' : ''}`,

  // ConfirmModal
  'confirm.cancel': 'Cancel',
  'confirm.delete': 'Delete',

  // Default data
  'default.tabPersonal': 'Personal',
  'default.tabWork': 'Work',
  'default.colToday': 'Today',
  'default.colThisWeek': 'This week',
  'default.colLater': 'Later',

  // Emoji default names
  'emojiName.📋': 'Tasks',
  'emojiName.🏠': 'Personal',
  'emojiName.💼': 'Work',
  'emojiName.🎯': 'Goals',
  'emojiName.🚀': 'Projects',
  'emojiName.💡': 'Ideas',
  'emojiName.🎨': 'Creative',
  'emojiName.📚': 'Reading',
  'emojiName.🏋️': 'Fitness',
  'emojiName.🎵': 'Music',
  'emojiName.✈️': 'Travel',
  'emojiName.🛒': 'Shopping',
  'emojiName.💰': 'Finance',
  'emojiName.❤️': 'Life',
  'emojiName.⭐': 'Favorites',
  'emojiName.🔧': 'Maintenance',
  'emojiName.📱': 'Apps',
  'emojiName.💻': 'Tech',
  'emojiName.🌍': 'World',
  'emojiName.📸': 'Photos',
  'emojiName.🎮': 'Gaming',
  'emojiName.🧹': 'Cleaning',
  'emojiName.🍳': 'Cooking',
  'emojiName.📅': 'Planning',
  'emojiName.🎓': 'Learning',
  'emojiName.🐾': 'Pets',
  'emojiName.🌱': 'Garden',
  'emojiName.🧘': 'Wellness',
  'emojiName.🏖️': 'Vacation',
  'emojiName.🎁': 'Gifts',
  'emojiName.📝': 'Notes',
  'emojiName.🔬': 'Research',
  'emojiName.🏗️': 'Building',
  'emojiName.⚡': 'Quick',

  // Sync
  'sync.title': 'Cloud Sync',
  'sync.description': 'Sync your data across devices. Your data goes directly to the provider, never through our servers.',
  'sync.notConnected': 'Cloud sync not connected',
  'sync.syncing': 'Syncing...',
  'sync.error': 'Sync error',
  'sync.offline': 'Offline',
  'sync.lastSync': (time) => `Last sync: ${time}`,
  'sync.lastModified': (time) => `Last modified: ${time}`,
  'sync.neverSynced': 'Never synced',
  'sync.pendingSync': 'Changes pending sync',
  'sync.syncNow': 'Sync now',
  'sync.disconnect': 'Disconnect',
  'sync.githubDescription': 'Sync via a private Gist',
  'sync.googleDescription': 'Sync via hidden app data',
  'sync.notConfigured': 'Not configured',
  'sync.conflictTitle': 'Data found in the cloud',
  'sync.conflictDescription': 'Existing data was found in the cloud. What do you want to keep?',
  'sync.conflictRemoteInfo': (tabs, tasks, date) => `Cloud: ${tabs} project${tabs !== 1 ? 's' : ''}, ${tasks} task${tasks !== 1 ? 's' : ''} (${date})`,
  'sync.useCloud': 'Use cloud data',
  'sync.useLocal': 'Keep local data',
  'sync.mergeBoth': 'Merge both',
  'sync.cancelDisconnect': 'Cancel and disconnect',
  'sync.disconnected': 'Sync has been disconnected',
  'sync.reconnect': 'Reconnect',
  'sync.dismiss': 'Dismiss',
  'drawer.cloudSync': 'Cloud sync',
  'drawer.data': 'My data',

  // Data export/import
  'data.title': 'My data',
  'data.export': 'Export',
  'data.import': 'Import',
  'data.exportSuccess': 'Data exported successfully',
  'data.importError': 'Invalid file',
  'data.importConfirm': 'This will replace all your current data. Continue?',
  'data.confirmReplace': 'Replace',
  'data.clearConfirmWord': 'DELETE',
  'data.clearConfirmPrompt': (word) => `Type "${word}" to confirm`,

  // Onboarding
  'onboarding.welcomeTitle': 'Welcome to Brainflush!',
  'onboarding.welcomeSubtitle': 'A simple way to organize your tasks and ideas.',
  'onboarding.featureProjects': 'Organize by project: work, personal, hobbies...',
  'onboarding.featureLists': 'Break each project into lists: Today, This Week, Later...',
  'onboarding.featureTasks': 'Add tasks, drag to reorder, swipe to navigate.',
  'onboarding.next': 'Next',
  'onboarding.skip': 'Skip',
  'onboarding.syncTitle': 'Sync your data',
  'onboarding.syncDescription': 'Keep your tasks in sync across devices. Your data stays private.',
  'onboarding.maybeLater': 'Maybe later',

  // Install banner
  'install.title': 'Install Brainflush',
  'install.description': 'Add to your home screen for quick access',
  'install.button': 'Install',

  // Seed data
  'seed.tabSideProject': 'Side Project',
  'seed.tabFitness': 'Fitness',
  'seed.tabLearning': 'Learning',
  'seed.colSomeday': 'Someday',
  'seed.colUrgent': 'Urgent',
  'seed.colInProgress': 'In progress',
  'seed.colBacklog': 'Backlog',
  'seed.colDone': 'Done',
  'seed.colMVP': 'MVP',
  'seed.colNiceToHave': 'Nice to have',
  'seed.colShipped': 'Shipped',
  'seed.colRoutine': 'Routine',
  'seed.colGoals': 'Goals',
  'seed.colUpNext': 'Up next',
  'seed.colCompleted': 'Completed',
}

export const fr = {
  // Header
  'header.menu': 'Menu',
  'header.seedData': 'Charger des donn\u00e9es test',
  'header.backToBoard': 'Retour au tableau',
  'header.archives': 'Archives',

  // Drawer
  'drawer.projects': 'Projets',
  'drawer.addProject': 'Ajouter un projet',
  'drawer.seedData': 'Charger des donn\u00e9es test',
  'drawer.clearData': 'Vider toutes les données',
  'drawer.clearDataConfirm': 'Supprimer TOUTES les données locales ? Cette action est irréversible.',
  'drawer.archives': 'Archives',
  'drawer.themeLight': 'Th\u00e8me : Clair',
  'drawer.themeDark': 'Th\u00e8me : Sombre',
  'drawer.language': 'Langue',

  // App / Lists
  'app.addList': 'Ajouter une liste',

  // AddTaskSheet
  'addTask.title': 'Ajouter une nouvelle t\u00e2che',
  'addTask.placeholder': "Qu'avez-vous en t\u00eate\u00a0?",
  'addTask.submit': 'Ajouter',

  // TaskInput
  'taskInput.placeholder': 'Ajouter une t\u00e2che...',

  // TaskCard
  'taskCard.undo': 'Annuler',
  'taskCard.archive': 'Archiver',

  // TaskDetailModal
  'taskDetail.editTask': 'Modifier la t\u00e2che',
  'taskDetail.created': (date) => `Cr\u00e9\u00e9e le ${date}`,
  'taskDetail.moveTo': 'D\u00e9placer vers',
  'taskDetail.delete': 'Supprimer',
  'taskDetail.save': 'Enregistrer',
  'taskDetail.confirmTitle': 'Supprimer la t\u00e2che\u00a0?',
  'taskDetail.confirmMessage': 'Cette action est irr\u00e9versible.',

  // ArchiveView
  'archive.title': 'Archives',
  'archive.meta': (date, column) => `Archiv\u00e9e le ${date} \u00b7 de ${column}`,
  'archive.unknownList': 'Liste inconnue',
  'archive.restore': 'Restaurer',
  'archive.deletePermanently': 'Supprimer d\u00e9finitivement',
  'archive.empty': 'Aucune t\u00e2che archiv\u00e9e',
  'archive.confirmTitle': 'Supprimer d\u00e9finitivement\u00a0?',
  'archive.confirmMessage': 'Cette action est irr\u00e9versible.',

  // TabEditor
  'tabEditor.newProject': 'Nouveau projet',
  'tabEditor.editProject': 'Modifier le projet',
  'tabEditor.placeholder': 'Nom du projet',
  'tabEditor.confirmDelete': 'Confirmer la suppression',
  'tabEditor.delete': 'Supprimer',
  'tabEditor.cancel': 'Annuler',
  'tabEditor.create': 'Cr\u00e9er',
  'tabEditor.save': 'Enregistrer',

  // ListEditor
  'listEditor.title': 'Nouvelle liste',
  'listEditor.placeholder': 'Nom de la liste',
  'listEditor.cancel': 'Annuler',
  'listEditor.add': 'Ajouter',

  // ListHeader
  'listHeader.rename': 'Renommer',
  'listHeader.moveLeft': 'D\u00e9placer \u00e0 gauche',
  'listHeader.moveRight': 'D\u00e9placer \u00e0 droite',
  'listHeader.moveAllTasks': 'D\u00e9placer les t\u00e2ches',
  'listHeader.delete': 'Supprimer',
  'listHeader.deleteTitle': 'Supprimer la liste',
  'listHeader.deleteConfirmPrefix': 'Supprimer',
  'listHeader.deleteConfirmSuffix': (count) => {
    if (count > 0) {
      return `et ses ${count} t\u00e2che${count > 1 ? 's' : ''}\u00a0? Cette action est irr\u00e9versible.`
    }
    return '\u00a0? Cette action est irr\u00e9versible.'
  },
  'listHeader.cancel': 'Annuler',

  // List
  'list.noTasks': 'Aucune t\u00e2che',
  'list.empty': 'Cette liste est vide',
  'list.addTask': 'Ajouter une t\u00e2che',

  // MoveTasksModal
  'moveTasks.title': 'D\u00e9placer les t\u00e2ches vers\u2026',
  'moveTasks.project': 'Projet',
  'moveTasks.list': 'Liste',
  'moveTasks.noLists': 'Aucune autre liste dans ce projet',
  'moveTasks.cancel': 'Annuler',
  'moveTasks.submit': (count) => `D\u00e9placer ${count} t\u00e2che${count !== 1 ? 's' : ''}`,

  // ConfirmModal
  'confirm.cancel': 'Annuler',
  'confirm.delete': 'Supprimer',

  // Default data
  'default.tabPersonal': 'Personnel',
  'default.tabWork': 'Travail',
  'default.colToday': "Aujourd'hui",
  'default.colThisWeek': 'Cette semaine',
  'default.colLater': 'Plus tard',

  // Emoji default names
  'emojiName.📋': 'Tâches',
  'emojiName.🏠': 'Personnel',
  'emojiName.💼': 'Travail',
  'emojiName.🎯': 'Objectifs',
  'emojiName.🚀': 'Projets',
  'emojiName.💡': 'Idées',
  'emojiName.🎨': 'Créatif',
  'emojiName.📚': 'Lecture',
  'emojiName.🏋️': 'Sport',
  'emojiName.🎵': 'Musique',
  'emojiName.✈️': 'Voyage',
  'emojiName.🛒': 'Courses',
  'emojiName.💰': 'Finances',
  'emojiName.❤️': 'Vie perso',
  'emojiName.⭐': 'Favoris',
  'emojiName.🔧': 'Maintenance',
  'emojiName.📱': 'Apps',
  'emojiName.💻': 'Tech',
  'emojiName.🌍': 'Monde',
  'emojiName.📸': 'Photos',
  'emojiName.🎮': 'Jeux',
  'emojiName.🧹': 'Ménage',
  'emojiName.🍳': 'Cuisine',
  'emojiName.📅': 'Planning',
  'emojiName.🎓': 'Études',
  'emojiName.🐾': 'Animaux',
  'emojiName.🌱': 'Jardin',
  'emojiName.🧘': 'Bien-être',
  'emojiName.🏖️': 'Vacances',
  'emojiName.🎁': 'Cadeaux',
  'emojiName.📝': 'Notes',
  'emojiName.🔬': 'Recherche',
  'emojiName.🏗️': 'Construction',
  'emojiName.⚡': 'Rapide',

  // Sync
  'sync.title': 'Synchro cloud',
  'sync.description': 'Synchronisez vos donn\u00e9es entre appareils. Vos donn\u00e9es vont directement au fournisseur, jamais via nos serveurs.',
  'sync.notConnected': 'Synchro cloud non connect\u00e9e',
  'sync.syncing': 'Synchronisation...',
  'sync.error': 'Erreur de synchronisation',
  'sync.offline': 'Hors ligne',
  'sync.lastSync': (time) => `Derni\u00e8re synchro : ${time}`,
  'sync.lastModified': (time) => `Derni\u00e8re modification : ${time}`,
  'sync.neverSynced': 'Jamais synchronis\u00e9',
  'sync.pendingSync': 'Modifications en attente de synchro',
  'sync.syncNow': 'Synchroniser',
  'sync.disconnect': 'D\u00e9connecter',
  'sync.githubDescription': 'Synchro via un Gist priv\u00e9',
  'sync.googleDescription': "Synchro via les donn\u00e9es d'app cach\u00e9es",
  'sync.notConfigured': 'Non configur\u00e9',
  'sync.conflictTitle': 'Donn\u00e9es trouv\u00e9es dans le cloud',
  'sync.conflictDescription': 'Des donn\u00e9es existantes ont \u00e9t\u00e9 trouv\u00e9es dans le cloud. Que souhaitez-vous conserver\u00a0?',
  'sync.conflictRemoteInfo': (tabs, tasks, date) => `Cloud : ${tabs} projet${tabs !== 1 ? 's' : ''}, ${tasks} t\u00e2che${tasks !== 1 ? 's' : ''} (${date})`,
  'sync.useCloud': 'Utiliser les donn\u00e9es cloud',
  'sync.useLocal': 'Garder les donn\u00e9es locales',
  'sync.mergeBoth': 'Fusionner les deux',
  'sync.cancelDisconnect': 'Annuler et se d\u00e9connecter',
  'sync.disconnected': 'La synchronisation a \u00e9t\u00e9 d\u00e9connect\u00e9e',
  'sync.reconnect': 'Reconnecter',
  'sync.dismiss': 'Ignorer',
  'drawer.cloudSync': 'Synchro cloud',
  'drawer.data': 'Mes données',

  // Data export/import
  'data.title': 'Mes données',
  'data.export': 'Exporter',
  'data.import': 'Importer',
  'data.exportSuccess': 'Données exportées avec succès',
  'data.importError': 'Fichier invalide',
  'data.importConfirm': 'Cela remplacera toutes vos données actuelles. Continuer ?',
  'data.confirmReplace': 'Remplacer',
  'data.clearConfirmWord': 'SUPPRIMER',
  'data.clearConfirmPrompt': (word) => `Tapez « ${word} » pour confirmer`,

  // Onboarding
  'onboarding.welcomeTitle': 'Bienvenue sur Brainflush !',
  'onboarding.welcomeSubtitle': "Un moyen simple d'organiser vos tâches et idées.",
  'onboarding.featureProjects': 'Organisez par projet : travail, perso, loisirs...',
  'onboarding.featureLists': "Découpez chaque projet en listes : Aujourd'hui, Cette semaine, Plus tard...",
  'onboarding.featureTasks': 'Ajoutez des tâches, glissez pour réorganiser, swipez pour naviguer.',
  'onboarding.next': 'Suivant',
  'onboarding.skip': 'Passer',
  'onboarding.syncTitle': 'Synchronisez vos données',
  'onboarding.syncDescription': 'Gardez vos tâches synchronisées entre appareils. Vos données restent privées.',
  'onboarding.maybeLater': 'Plus tard',

  // Install banner
  'install.title': 'Installer Brainflush',
  'install.description': "Ajoutez \u00e0 votre \u00e9cran d'accueil pour un acc\u00e8s rapide",
  'install.button': 'Installer',

  // Seed data
  'seed.tabSideProject': 'Projet perso',
  'seed.tabFitness': 'Sport',
  'seed.tabLearning': 'Apprentissage',
  'seed.colSomeday': 'Un jour',
  'seed.colUrgent': 'Urgent',
  'seed.colInProgress': 'En cours',
  'seed.colBacklog': 'À faire',
  'seed.colDone': 'Terminé',
  'seed.colMVP': 'MVP',
  'seed.colNiceToHave': 'Bonus',
  'seed.colShipped': 'Livré',
  'seed.colRoutine': 'Routine',
  'seed.colGoals': 'Objectifs',
  'seed.colUpNext': 'À venir',
  'seed.colCompleted': 'Complété',
}
