let scPlayer = null;
let scIsReady = false;
const COUNTDOWN_TARGET = new Date(2026, 7, 1, 17, 0, 0);
const RSVP_MIN_ATTENDEES = 1;
const RSVP_MAX_ATTENDEES = 5;
const MAX_SINGLE_PHOTO_BYTES = 2 * 1024 * 1024;
const VALID_PHOTO_TYPES = ['image/jpeg', 'image/png'];
const ANIMATION_PAGE_FLIP_MS = 800;
const ANIMATION_NEWSPAPER_MS = 1200;
const RSVP_INVITATIONS_COLLECTION = 'invitations';
const RSVP_RECORDS_COLLECTION = 'rsvps';
const LOCAL_RSVP_STORAGE_KEY = 'weddingLocalFirestore';
const CEREMONY_INFO = {
    ceremony: {
        title: 'Ceremonia religiosa',
        schedule: 'Sábado 1 de agosto de 2026, 5:00 PM',
        venue: 'Parroquia / Ceremonia principal',
        address: 'Dirección por confirmar',
        note: 'Llegar 15 minutos antes para acomodación.'
    },
    reception: {
        title: 'Recepción',
        schedule: 'Sábado 1 de agosto de 2026, 7:00 PM',
        venue: 'Salón de eventos',
        address: 'Dirección por confirmar',
        note: 'Después de la ceremonia, nos reuniremos para celebrar.'
    }
};

function getServerTimestamp() {
    return (typeof firebase !== 'undefined' &&
        firebase &&
        firebase.firestore &&
        firebase.firestore.FieldValue &&
        typeof firebase.firestore.FieldValue.serverTimestamp === 'function')
        ? firebase.firestore.FieldValue.serverTimestamp()
        : new Date().toISOString();
}

function createLocalRsvpDatabase() {
    const readState = () => {
        try {
            const raw = localStorage.getItem(LOCAL_RSVP_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (error) {
            console.warn('No se pudo leer la base local de RSVP:', error);
            return {};
        }
    };

    const writeState = (state) => {
        localStorage.setItem(LOCAL_RSVP_STORAGE_KEY, JSON.stringify(state));
    };

    const ensureSeed = () => {
        const state = readState();
        state.invitations = state.invitations || {};
        state.rsvps = state.rsvps || {};

        if (!state.invitations['QDX-2027']) {
            state.invitations['QDX-2027'] = {
                guestName: 'Invitado de prueba',
                expectedAttendees: 2,
                confirmed: false,
                confirmedAt: null,
                confirmedAttendees: 0
            };
        }

        writeState(state);
    };

    const normalizeDocData = (value) => {
        if (!value || typeof value !== 'object') {
            return {};
        }

        return { ...value };
    };

    ensureSeed();

    return {
        collection(collectionName) {
            return {
                async get() {
                    const state = readState();
                    const collection = state[collectionName] || {};
                    return { size: Object.keys(collection).length };
                },
                doc(docId) {
                    return {
                        async get() {
                            const state = readState();
                            const collection = state[collectionName] || {};
                            const data = collection[docId];
                            return {
                                exists: Boolean(data),
                                data: () => normalizeDocData(data)
                            };
                        },
                        async set(payload, options = {}) {
                            const state = readState();
                            state[collectionName] = state[collectionName] || {};
                            const existing = state[collectionName][docId] || {};
                            state[collectionName][docId] = options.merge
                                ? { ...existing, ...payload }
                                : { ...payload };
                            writeState(state);
                        }
                    };
                }
            };
        }
    };
}

// =================== FIREBASE INIT ===================
let firebaseInitialized = false;
let firebaseDb = null;
const useLocalRsvpDb = typeof firebaseConfig !== 'undefined' && firebaseConfig && firebaseConfig.useLocalRsvpDb === true;
const hasFirebaseRuntime = typeof firebase !== 'undefined' &&
    firebase &&
    typeof firebase.initializeApp === 'function' &&
    typeof firebase.storage === 'function' &&
    typeof firebase.firestore === 'function';

// Esperar a que firebase-config.js se cargue (si existe)
if (useLocalRsvpDb) {
    firebaseDb = createLocalRsvpDatabase();
    console.log('✓ Base local de RSVP inicializada correctamente');
} else if (typeof firebaseConfig !== 'undefined' && hasFirebaseRuntime) {
    try {
        firebase.initializeApp(firebaseConfig);
        firebaseInitialized = true;
        firebaseDb = firebase.firestore();
        console.log('✓ Firebase inicializado correctamente');
    } catch (error) {
        console.warn('⚠ Error al inicializar Firebase:', error.message);
        console.warn('Para habilitar subida de fotos, sigue las instrucciones en FIREBASE_SETUP.md');
    }
} else if (typeof firebaseConfig !== 'undefined') {
    console.warn('⚠ firebase-config.js está presente, pero la SDK de Firebase compat completa no está cargada.');
    console.warn('La subida de fotos no funcionará hasta corregir el orden o tipo de scripts.');
} else {
    console.warn('⚠ firebase-config.js no encontrado. Las fotos se guardarán como URLs externas.');
    console.warn('Para habilitar subida de fotos, sigue las instrucciones en FIREBASE_SETUP.md');
}

async function uploadPhotoToFirebase(file) {
    if (!firebaseInitialized) {
        throw new Error("Firebase no está configurado o la SDK no está cargada. Lee FIREBASE_SETUP.md.");
    }

    try {
        const timestamp = Date.now();
        const fileName = `singles/${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const storageRef = firebase.storage().ref(fileName);
        
        // Upload with progress
        const uploadTask = storageRef.put(file);
        
        // Wait for completion
        await uploadTask;
        
        // Get download URL
        const downloadURL = await storageRef.getDownloadURL();
        return downloadURL;
    } catch (error) {
        console.error("Error uploading photo:", error);
        throw new Error("Error al subir la foto. Verifica tu conexión y intenta de nuevo.");
    }
}

function safeJsonParse(value, fallback) {
    try {
        const parsed = JSON.parse(value);
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
}

function normalizeInvitationCode(value) {
    return String(value || '')
        .trim()
        .replace(/\s+/g, '')
        .toUpperCase();
}

function createGalleryFallback(title, caption) {
    const placeholder = document.createElement('div');
    placeholder.className = 'gallery-item-placeholder';

    const titleLine = document.createElement('div');
    titleLine.textContent = `[ ${title || 'Fotografía Archivo'} ]`;

    const captionLine = document.createElement('div');
    captionLine.textContent = caption || 'Archivo no disponible';

    placeholder.appendChild(titleLine);
    placeholder.appendChild(captionLine);
    return placeholder;
}

document.addEventListener('DOMContentLoaded', () => {
    // =================== SOUNDCLOUD INIT ===================
    const iframeElement = document.getElementById('sc-widget');
    if (iframeElement && typeof SC !== 'undefined') {
        scPlayer = SC.Widget(iframeElement);
        scPlayer.bind(SC.Widget.Events.READY, function() {
            scIsReady = true;
        });
        scPlayer.bind(SC.Widget.Events.FINISH, function() {
            scPlayer.play(); // Loop
        });
    }
    // =================== VIDEO INTRO & NEWSPAPER ANIMATION ===================
    const videoContainer = document.getElementById('videoContainer');
    const introVideo = document.getElementById('introVideo');
    const skipVideoBtn = document.getElementById('skipVideoBtn');
    
    const introOverlay = document.getElementById('introOverlay');
    const newspaperIntro = document.getElementById('newspaperIntro');
    const newspaperLeft = document.getElementById('newspaperLeft');
    const newspaperRight = document.getElementById('newspaperRight');

    const musicToggle = document.getElementById('musicToggle');
    const musicLabel = document.getElementById('musicLabel');

    let videoCompleted = false;
    let newspaperOpened = false;

    // Show Newspaper Intro Overlay
    function showNewspaperIntro() {
        if (videoCompleted) return;
        videoCompleted = true;
        
        videoContainer.classList.add('hidden');
        introVideo.pause();

        // Show the newspaper overlay
        introOverlay.classList.add('active');
    }

    // Handle video end
    if(introVideo) {
        introVideo.addEventListener('ended', showNewspaperIntro);
        // Attempt to play automatically
        introVideo.play().catch(() => {
            // Autoplay might be blocked, user must click skip
            console.log("Autoplay prevented by browser.");
        });
    }

    // Handle Skip Video
    if(skipVideoBtn) {
        skipVideoBtn.addEventListener('click', showNewspaperIntro);
    }

    // Handle Newspaper Page Turn
    function openNewspaper() {
        if (newspaperOpened) return;
        newspaperOpened = true;

        // Add page flip classes
        newspaperLeft.classList.add('page-flip-left');
        newspaperRight.classList.add('page-flip-right');

        // Play background music via SoundCloud
        if (scPlayer && scIsReady) {
            scPlayer.play();
        }

        // Show music toggle
        if (musicToggle) {
            musicToggle.style.display = 'flex';
            musicToggle.classList.add('playing');
        }

        // Hide overlay and show content after flip animation finishes
        setTimeout(() => {
            introOverlay.classList.remove('active');
            introOverlay.classList.add('fade-out');
            document.body.classList.add('content-visible');
        }, ANIMATION_NEWSPAPER_MS);
    }

    if(newspaperIntro) {
        newspaperIntro.addEventListener('click', openNewspaper);
    }

    // =================== MUSIC PLAYER LOGIC ===================
    let isPlaying = true;
    if (musicToggle) {
        musicToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            isPlaying = !isPlaying;
            
            if (isPlaying) {
                if (scPlayer && scIsReady) scPlayer.play();
                musicToggle.classList.add('playing');
                if(musicLabel) musicLabel.textContent = 'Pausar música';
            } else {
                if (scPlayer && scIsReady) scPlayer.pause();
                musicToggle.classList.remove('playing');
                if(musicLabel) musicLabel.textContent = 'Reproducir música';
            }
        });
    }

    // =================== COUNTDOWN TIMER ===================
    function updateCountdown() {
        const daysEl = document.getElementById('days');
        if (!daysEl) return;

        const distance = COUNTDOWN_TARGET.getTime() - Date.now();

        if (distance < 0) {
            daysEl.textContent = '0';
            document.getElementById('hours').textContent = '0';
            document.getElementById('minutes').textContent = '0';
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

        daysEl.textContent = String(days).padStart(2, '0');
        document.getElementById('hours').textContent = String(hours).padStart(2, '0');
        document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);

    // =================== GALLERY TOGGLE ===================
    const galleryToggle = document.getElementById('galleryToggle');
    const galleryContent = document.getElementById('galleryContent');

    if(galleryToggle && galleryContent) {
        galleryToggle.addEventListener('click', () => {
            galleryContent.classList.toggle('expanded');
            galleryToggle.textContent = galleryContent.classList.contains('expanded') 
                ? 'Ocultar recuerdos' 
                : 'Ver recuerdos';
        });
    }

    // =================== PAGE 2 GALLERY ===================
    const galleryImages = document.querySelectorAll('.gallery-item img');
    galleryImages.forEach((img) => {
        const handleGalleryFallback = () => {
            if (!img.isConnected) return;
            const title = img.dataset.placeholderTitle;
            const caption = img.dataset.placeholderCaption;
            img.replaceWith(createGalleryFallback(title, caption));
        };

        if (img.complete && img.naturalWidth === 0) {
            handleGalleryFallback();
            return;
        }

        img.addEventListener('error', handleGalleryFallback);
    });

    // =================== RSVP SYSTEM ===================
    const rsvpButton = document.getElementById('rsvpButton');
    const attendeesInput = document.getElementById('attendees');
    const invitationCodeInput = document.getElementById('invitationCode');
    const totalConfirmed = document.getElementById('totalConfirmed');
    const rsvpModal = document.getElementById('rsvpModal');
    const rsvpModalSubtitle = document.getElementById('rsvpModalSubtitle');
    const rsvpModalValidation = document.getElementById('rsvpModalValidation');
    const ceremonyInfo = document.getElementById('ceremonyInfo');
    const receptionInfo = document.getElementById('receptionInfo');
    const locationModal = document.getElementById('locationModal');
    const locationModalSubtitle = document.getElementById('locationModalSubtitle');
    const confirmAttendanceBtn = document.getElementById('confirmAttendanceBtn');
    const cancelAttendanceBtn = document.getElementById('cancelAttendanceBtn');
    const modalCloseButtons = document.querySelectorAll('[data-close-modal]');
    const locationCloseButtons = document.querySelectorAll('[data-close-location-modal]');
    let pendingRsvp = null;

    function renderCeremonyBlock(info) {
        return `
            <strong>${info.title}</strong><br>
            ${info.schedule}<br>
            ${info.venue}<br>
            ${info.address}<br>
            <em>${info.note}</em>
        `;
    }

    function openRsvpModal() {
        if (!rsvpModal || !pendingRsvp) return;

        rsvpModal.classList.add('active');
        rsvpModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');

        const guestName = pendingRsvp.invitation.guestName || 'Invitado';
        rsvpModalSubtitle.textContent = `Hola ${guestName}. Revisa la información antes de confirmar tu asistencia.`;
        rsvpModalValidation.textContent = `Código ${pendingRsvp.code} verificado. Tu invitación permite ${pendingRsvp.expectedAttendees} asistentes y seleccionaste ${pendingRsvp.attendees}.`;
        ceremonyInfo.innerHTML = renderCeremonyBlock(CEREMONY_INFO.ceremony);
        receptionInfo.innerHTML = renderCeremonyBlock(CEREMONY_INFO.reception);
    }

    function closeRsvpModal() {
        if (!rsvpModal) return;

        rsvpModal.classList.remove('active');
        rsvpModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
        pendingRsvp = null;
    }

    function openLocationModal(guestName) {
        if (!locationModal) return;

        if (locationModalSubtitle) {
            locationModalSubtitle.textContent = `Gracias${guestName ? `, ${guestName}` : ''}. Aquí tienes la guía editorial de ubicación y hospedaje.`;
        }

        locationModal.classList.add('active');
        locationModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
    }

    function closeLocationModal() {
        if (!locationModal) return;

        locationModal.classList.remove('active');
        locationModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
    }

    async function refreshConfirmedCount() {
        if (!totalConfirmed) return;

        if (firebaseDb) {
            try {
                const snapshot = await firebaseDb.collection(RSVP_RECORDS_COLLECTION).get();
                totalConfirmed.textContent = snapshot.size;
                return;
            } catch (error) {
                console.warn('No se pudo leer el total de confirmados desde Firestore:', error);
            }
        }

        const savedCount = Number.parseInt(localStorage.getItem('weddingRSVP') || '0', 10);
        totalConfirmed.textContent = Number.isFinite(savedCount) ? String(savedCount) : '0';
    }

    async function fetchInvitation(code) {
        if (!firebaseDb) {
            throw new Error('Firestore no está disponible.');
        }

        const normalizedCode = normalizeInvitationCode(code);
        const snapshot = await firebaseDb.collection(RSVP_INVITATIONS_COLLECTION).doc(normalizedCode).get();
        return snapshot.exists ? { code: normalizedCode, ...snapshot.data() } : null;
    }

async function saveRsvpConfirmation() {
    if (!pendingRsvp || !firebaseDb) {
        throw new Error('No hay una confirmación pendiente.');
    }

        const rsvpRef = firebaseDb.collection(RSVP_RECORDS_COLLECTION).doc(pendingRsvp.code);
        const existing = await rsvpRef.get();
        if (existing.exists) {
            throw new Error('Este código ya fue usado para confirmar asistencia.');
        }

        const payload = {
            code: pendingRsvp.code,
            guestName: pendingRsvp.invitation.guestName || '',
            attendees: pendingRsvp.attendees,
            expectedAttendees: pendingRsvp.expectedAttendees,
            confirmedAt: getServerTimestamp()
        };

        await rsvpRef.set(payload);
        await firebaseDb.collection(RSVP_INVITATIONS_COLLECTION).doc(pendingRsvp.code).set({
            confirmed: true,
            confirmedAt: getServerTimestamp(),
            confirmedAttendees: pendingRsvp.attendees
        }, { merge: true });

        // Enviar datos a n8n a través de un Webhook
        try {
            // Reemplaza esta URL con la "Production URL" de tu nodo Webhook en n8n
            const webhookUrl = 'TU_URL_DE_N8N_AQUI'; 
            if (webhookUrl !== 'TU_URL_DE_N8N_AQUI') {
                fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload) // Enviamos código, nombre, y asistentes
                }).catch(err => console.log('Error silenciado al enviar a n8n', err));
            }
        } catch (error) {
            console.log('Error de red con n8n');
        }
    }

    if (rsvpModal) {
        modalCloseButtons.forEach((button) => {
            button.addEventListener('click', closeRsvpModal);
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                if (locationModal && locationModal.classList.contains('active')) {
                    closeLocationModal();
                } else {
                    closeRsvpModal();
                }
            }
        });
    }

    if (locationModal) {
        locationCloseButtons.forEach((button) => {
            button.addEventListener('click', closeLocationModal);
        });
    }

    if (rsvpButton && attendeesInput && invitationCodeInput && totalConfirmed) {
        refreshConfirmedCount();

        rsvpButton.addEventListener('click', async () => {
            const attendees = Number.parseInt(attendeesInput.value, 10) || 1;
            const invitationCode = normalizeInvitationCode(invitationCodeInput.value);

            if (!firebaseDb) {
                alert('La base de datos de confirmación no está disponible. Verifica Firebase.');
                return;
            }

            if (!invitationCode) {
                alert('Ingresa tu código de invitación para continuar.');
                return;
            }

            if (attendees < RSVP_MIN_ATTENDEES || attendees > RSVP_MAX_ATTENDEES) {
                alert(`Por favor, ingresa un número entre ${RSVP_MIN_ATTENDEES} y ${RSVP_MAX_ATTENDEES} invitados`);
                return;
            }

            const originalText = rsvpButton.textContent;
            rsvpButton.disabled = true;
            rsvpButton.textContent = 'Verificando...';

            try {
                const invitation = await fetchInvitation(invitationCode);

                if (!invitation) {
                    alert('El código de invitación no existe o no es válido.');
                    return;
                }

                const expectedAttendees = Number.parseInt(invitation.allowedAttendees ?? invitation.attendees ?? 0, 10);
                if (!Number.isFinite(expectedAttendees) || expectedAttendees <= 0) {
                    alert('La invitación no tiene configurado un número válido de asistentes.');
                    return;
                }

                if (attendees > expectedAttendees) {
                    alert(`Este código permite un máximo de ${expectedAttendees} asistentes. Por favor, ajusta el número antes de continuar.`);
                    return;
                }

                const existingRsvp = await firebaseDb.collection(RSVP_RECORDS_COLLECTION).doc(invitationCode).get();
                if (existingRsvp.exists) {
                    alert('Este código ya confirmó asistencia.');
                    return;
                }

                pendingRsvp = {
                    code: invitationCode,
                    attendees,
                    expectedAttendees,
                    invitation
                };

                openRsvpModal();
            } catch (error) {
                console.error('Error verificando la invitación:', error);
                alert(error.message || 'No se pudo verificar el código. Intenta de nuevo.');
            } finally {
                rsvpButton.disabled = false;
                rsvpButton.textContent = originalText;
            }
        });
    }

    if (confirmAttendanceBtn) {
        confirmAttendanceBtn.addEventListener('click', async () => {
            if (!pendingRsvp) {
                return;
            }

            const originalText = confirmAttendanceBtn.textContent;
            confirmAttendanceBtn.disabled = true;
            confirmAttendanceBtn.textContent = 'Confirmando...';

            try {
                await saveRsvpConfirmation();
                await refreshConfirmedCount();
                const guestName = pendingRsvp.guestName;
                closeRsvpModal();
                openLocationModal(guestName);

                if (rsvpButton) {
                    rsvpButton.textContent = '¡Asistencia confirmada!';
                    rsvpButton.style.background = 'var(--light-grey)';
                    rsvpButton.style.color = '#000';
                    setTimeout(() => {
                        rsvpButton.textContent = 'Confirmar';
                        rsvpButton.style.background = '';
                        rsvpButton.style.color = '';
                    }, 2000);
                }

                attendeesInput.value = '1';
                invitationCodeInput.value = '';
            } catch (error) {
                console.error('Error confirmando asistencia:', error);
                alert(error.message || 'No se pudo confirmar la asistencia.');
            } finally {
                confirmAttendanceBtn.disabled = false;
                confirmAttendanceBtn.textContent = originalText;
            }
        });
    }

    // =================== PAGINATION LOGIC ===================
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetPageId = 'page-' + btn.getAttribute('data-target');
            const targetPage = document.getElementById(targetPageId);
            const currentPage = document.querySelector('.book-page.active');

            if (!targetPage || targetPage === currentPage) return;

            const isNext = btn.classList.contains('next-btn');

            // Remove any leftover animation classes to avoid conflicts
            currentPage.classList.remove('flip-out-next', 'flip-out-prev', 'flip-in-next', 'flip-in-prev');
            targetPage.classList.remove('flip-out-next', 'flip-out-prev', 'flip-in-next', 'flip-in-prev');

            // Make target visible immediately but prepare for animation
            targetPage.style.visibility = 'visible';
            targetPage.style.opacity = '1';
            
            // Bring target page to front during animation
            targetPage.style.zIndex = '11';
            currentPage.style.zIndex = '10';

            if (isNext) {
                currentPage.classList.add('flip-out-next');
                targetPage.classList.add('flip-in-next');
            } else {
                currentPage.classList.add('flip-out-prev');
                targetPage.classList.add('flip-in-prev');
            }

            // Scroll to top for better experience when changing pages
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // After animation ends, switch the 'active' state fully
            setTimeout(() => {
                currentPage.classList.remove('active', 'flip-out-next', 'flip-out-prev');
                currentPage.style.zIndex = '';
                
                targetPage.classList.remove('flip-in-next', 'flip-in-prev');
                targetPage.style.zIndex = '';
                targetPage.classList.add('active');
                
                // Cleanup inline styles that helped during animation
                targetPage.style.visibility = '';
                targetPage.style.opacity = '';
            }, ANIMATION_PAGE_FLIP_MS);
        });
    });

    // =================== SINGLES GALLERY LOGIC ===================
    const singlesForm = document.getElementById('singlesForm');
    const singlesGrid = document.getElementById('singlesGrid');
    const photoUploadStatus = document.getElementById('photoUploadStatus');

    function getSavedSingles() {
        try {
        const saved = safeJsonParse(localStorage.getItem('weddingSingles') || '[]', []);
        return Array.isArray(saved) ? saved : [];
        } catch (error) {
            console.warn('No se pudieron leer los solteros guardados:', error);
            return [];
        }
    }

    function createPlaceholder(text) {
        const placeholder = document.createElement('div');
        placeholder.className = 'single-placeholder';
        placeholder.textContent = text;
        return placeholder;
    }

    function renderSingles() {
        if (!singlesGrid) return;
        
        singlesGrid.innerHTML = '';
        const savedSingles = getSavedSingles();
        
        if (savedSingles.length === 0) {
            const emptyState = document.createElement('p');
            emptyState.style.gridColumn = '1 / -1';
            emptyState.style.textAlign = 'center';
            emptyState.style.fontStyle = 'italic';
            emptyState.style.color = 'var(--dark-grey)';
            emptyState.textContent = 'Aún no hay solteros registrados. ¡Sé el primero!';
            singlesGrid.appendChild(emptyState);
            return;
        }

        savedSingles.forEach((single) => {
            const card = document.createElement('div');
            card.className = 'single-card';

            const imgWrapper = document.createElement('div');
            imgWrapper.className = 'single-card-img-wrapper';
            imgWrapper.title = 'Haz clic para ver descripción';

            if (single.photo) {
                const img = document.createElement('img');
                img.src = single.photo;
                img.alt = single.name || 'Foto de soltero';
                img.addEventListener('error', () => {
                    if (img.isConnected) {
                        img.replaceWith(createPlaceholder('?'));
                    }
                });
                imgWrapper.appendChild(img);
            } else {
                imgWrapper.appendChild(createPlaceholder('?'));
            }

            const overlay = document.createElement('div');
            overlay.className = 'single-overlay';

            const descText = document.createElement('div');
            descText.className = 'single-desc-text';
            descText.textContent = single.description || '';
            overlay.appendChild(descText);

            imgWrapper.appendChild(overlay);
            card.appendChild(imgWrapper);

            const info = document.createElement('div');
            info.className = 'single-info';

            const name = document.createElement('div');
            name.className = 'single-name';
            name.textContent = single.name || '';

            const phrase = document.createElement('div');
            phrase.className = 'single-phrase';
            phrase.textContent = `"${single.phrase || ''}"`;

            const hobbies = document.createElement('div');
            hobbies.className = 'single-hobbies';
            hobbies.textContent = single.hobbies || '';

            info.appendChild(name);
            info.appendChild(phrase);
            info.appendChild(hobbies);
            card.appendChild(info);
            
            // Toggle description overlay on image click
            imgWrapper.addEventListener('click', () => {
                card.classList.toggle('show-desc');
            });

            singlesGrid.appendChild(card);
        });
    }

    // Handle file input preview
    const fileInput = document.getElementById('singlePhoto');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (!VALID_PHOTO_TYPES.includes(file.type)) {
                    photoUploadStatus.textContent = '❌ Solo se permiten JPG o PNG';
                    photoUploadStatus.style.color = '#d00';
                    fileInput.value = '';
                    return;
                }
                
                if (file.size > MAX_SINGLE_PHOTO_BYTES) {
                    photoUploadStatus.textContent = '❌ La foto debe ser menor a 2MB';
                    photoUploadStatus.style.color = '#d00';
                    fileInput.value = '';
                    return;
                }
                
                photoUploadStatus.textContent = '✓ Foto seleccionada: ' + file.name;
                photoUploadStatus.style.color = '#060';
            }
        });
    }

    if (singlesForm) {
        // Initial render
        renderSingles();

        singlesForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fileInput = document.getElementById('singlePhoto');
            const file = fileInput.files[0];
            const submitBtn = singlesForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;

            if (!file) {
                photoUploadStatus.textContent = '❌ Debes seleccionar una foto';
                photoUploadStatus.style.color = '#d00';
                return;
            }

            try {
                submitBtn.textContent = 'Subiendo foto...';
                submitBtn.disabled = true;
                photoUploadStatus.textContent = 'Subiendo...';
                photoUploadStatus.style.color = '#666';

                // Upload photo to Firebase
                const photoURL = await uploadPhotoToFirebase(file);

                const newSingle = {
                    name: document.getElementById('singleName').value.trim(),
                    photo: photoURL,
                    phrase: document.getElementById('singlePhrase').value.trim(),
                    hobbies: document.getElementById('singleHobbies').value.trim(),
                    description: document.getElementById('singleDesc').value.trim()
                };

                const savedSingles = getSavedSingles();
                savedSingles.push(newSingle);
                localStorage.setItem('weddingSingles', JSON.stringify(savedSingles));

                // Feedback
                submitBtn.textContent = '¡Registrado!';
                submitBtn.style.background = 'var(--light-grey)';
                submitBtn.style.color = '#000';
                photoUploadStatus.textContent = '✓ ¡Foto subida correctamente!';
                photoUploadStatus.style.color = '#060';
                
                setTimeout(() => {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                    submitBtn.style.background = '';
                    submitBtn.style.color = '';
                    photoUploadStatus.textContent = '';
                }, 2000);

                singlesForm.reset();
                renderSingles();

            } catch (error) {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                photoUploadStatus.textContent = '❌ ' + error.message;
                photoUploadStatus.style.color = '#d00';
                console.error(error);
            }
        });
    }
});
