let scPlayer = null;
let scIsReady = false;

// =================== FIREBASE INIT ===================
let firebaseInitialized = false;

// Esperar a que firebase-config.js se cargue (si existe)
if (typeof firebaseConfig !== 'undefined') {
    try {
        firebase.initializeApp(firebaseConfig);
        firebaseInitialized = true;
        console.log('✓ Firebase inicializado correctamente');
    } catch (error) {
        console.warn('⚠ Error al inicializar Firebase:', error.message);
        console.warn('Para habilitar subida de fotos, sigue las instrucciones en FIREBASE_SETUP.md');
    }
} else {
    console.warn('⚠ firebase-config.js no encontrado. Las fotos se guardarán como URLs externas.');
    console.warn('Para habilitar subida de fotos, sigue las instrucciones en FIREBASE_SETUP.md');
}

async function uploadPhotoToFirebase(file) {
    if (!firebaseInitialized) {
        throw new Error("Firebase no está configurado. Lee FIREBASE_SETUP.md para instrucciones.");
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
        }, 1200);
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

        const targetDate = new Date('August 1, 2026 17:00:00').getTime();
        const now = new Date().getTime();
        const distance = targetDate - now;

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

    // =================== RSVP SYSTEM ===================
    const rsvpButton = document.getElementById('rsvpButton');
    const attendeesInput = document.getElementById('attendees');
    const totalConfirmed = document.getElementById('totalConfirmed');
    
    if (rsvpButton && attendeesInput && totalConfirmed) {
        let confirmedCount = 0;
        const savedCount = localStorage.getItem('weddingRSVP');
        if (savedCount) {
            confirmedCount = parseInt(savedCount);
            totalConfirmed.textContent = confirmedCount;
        }

        rsvpButton.addEventListener('click', () => {
            const attendees = parseInt(attendeesInput.value) || 1;
            
            if (attendees < 1 || attendees > 5) {
                alert('Por favor, ingresa un número entre 1 y 5 invitados');
                return;
            }

            confirmedCount += attendees;
            totalConfirmed.textContent = confirmedCount;
            localStorage.setItem('weddingRSVP', confirmedCount);

            rsvpButton.textContent = '¡Confirmado!';
            rsvpButton.style.background = 'var(--light-grey)';
            rsvpButton.style.color = '#000';
            
            setTimeout(() => {
                rsvpButton.textContent = 'Confirmar';
                rsvpButton.style.background = '';
                rsvpButton.style.color = '';
            }, 2000);

            attendeesInput.value = '1';
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
            }, 800);
        });
    });

    // =================== SINGLES GALLERY LOGIC ===================
    const singlesForm = document.getElementById('singlesForm');
    const singlesGrid = document.getElementById('singlesGrid');
    const photoUploadStatus = document.getElementById('photoUploadStatus');

    function renderSingles() {
        if (!singlesGrid) return;
        
        singlesGrid.innerHTML = '';
        const savedSingles = JSON.parse(localStorage.getItem('weddingSingles') || '[]');
        
        if (savedSingles.length === 0) {
            singlesGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; font-style: italic; color: var(--dark-grey);">Aún no hay solteros registrados. ¡Sé el primero!</p>';
            return;
        }

        savedSingles.forEach((single, index) => {
            const card = document.createElement('div');
            card.className = 'single-card';
            card.innerHTML = `
                <div class="single-card-img-wrapper" title="Haz clic para ver descripción">
                    ${single.photo ? `<img src="${single.photo}" alt="${single.name}" onerror="this.outerHTML='<div class=\\'single-placeholder\\'>?</div>'">` : '<div class="single-placeholder">?</div>'}
                    <div class="single-overlay">
                        <div class="single-desc-text">${single.description}</div>
                    </div>
                </div>
                <div class="single-info">
                    <div class="single-name">${single.name}</div>
                    <div class="single-phrase">"${single.phrase}"</div>
                    <div class="single-hobbies">${single.hobbies}</div>
                </div>
            `;
            
            // Toggle description overlay on image click
            const imgWrapper = card.querySelector('.single-card-img-wrapper');
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
                const validTypes = ['image/jpeg', 'image/png'];
                const maxSize = 2 * 1024 * 1024; // 2MB
                
                if (!validTypes.includes(file.type)) {
                    photoUploadStatus.textContent = '❌ Solo se permiten JPG o PNG';
                    photoUploadStatus.style.color = '#d00';
                    fileInput.value = '';
                    return;
                }
                
                if (file.size > maxSize) {
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
                    name: document.getElementById('singleName').value,
                    photo: photoURL,
                    phrase: document.getElementById('singlePhrase').value,
                    hobbies: document.getElementById('singleHobbies').value,
                    description: document.getElementById('singleDesc').value
                };

                const savedSingles = JSON.parse(localStorage.getItem('weddingSingles') || '[]');
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
