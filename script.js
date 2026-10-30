class Student {
    constructor(id, fullName, campus, course, section, prelim, midterm, final) {
        this.id = id;
        this.fullName = fullName;
        this.campus = campus;
        this.course = course;
        this.section = section;
        this.prelim = parseFloat(prelim);
        this.midterm = parseFloat(midterm);
        this.final = parseFloat(final);
        this.gwa = this.calculateGWA();
    }

    calculateGWA() {
        const weightedAvg = (this.prelim * 0.30) + (this.midterm * 0.30) + (this.final * 0.40);
        return Math.round(weightedAvg * 100) / 100;
    }

    getAcademicStatus() {
        return this.gwa >= 75.0 ? 'Passed' : 'Failed';
    }

    getHonorRemarks() {
        if (this.gwa >= 98) return 'Summa Cum Laude Candidate';
        if (this.gwa >= 95) return 'Magna Cum Laude Candidate';
        if (this.gwa >= 92) return 'Cum Laude Candidate';
        if (this.gwa >= 88) return 'Dean\'s List Candidate';
        return 'Regular';
    }
}

class GradeSystemManager {
    constructor() {
        this.students = [];
        this.chartInstance = null;
        
        this.loadFromStorage();
        this.initChart();
    }

    addStudent(student) {
        this.students.push(student);
        this.saveToStorage();
        this.render();
    }

    removeStudent(id) {
        this.students = this.students.filter(student => student.id !== id);
        this.saveToStorage();
        this.render();
    }

    clearAllStudents() {
        if (this.students.length === 0) return;
        if (confirm("Are you sure you want to erase all student records?")) {
            this.students = [];
            this.saveToStorage();
            this.render();
        }
    }

    getRankedStudents(filterCampus = 'ALL', searchQuery = '') {
        let filtered = [...this.students];

        if (filterCampus !== 'ALL') {
            filtered = filtered.filter(s => s.campus === filterCampus);
        }

        if (searchQuery.trim() !== '') {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(s => 
                s.fullName.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
            );
        }

        return filtered.sort((a, b) => b.gwa - a.gwa);
    }

    saveToStorage() {
        localStorage.setItem('isu_student_records', JSON.stringify(this.students));
    }

    loadFromStorage() {
        const stored = localStorage.getItem('isu_student_records');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                this.students = parsed.map(item => new Student(
                    item.id, item.fullName, item.campus, item.course, 
                    item.section, item.prelim, item.midterm, item.final
                ));
            } catch (e) {
                console.error("Failed to parse local storage records:", e);
                this.students = [];
            }
        }
    }

    updateDashboardStats() {
        const total = this.students.length;
        document.getElementById('stat-total-students').textContent = total;

        if (total === 0) {
            document.getElementById('stat-overall-gwa').textContent = '0.00';
            document.getElementById('stat-top-student').textContent = 'N/A';
            document.getElementById('stat-pass-rate').textContent = '0%';
            return;
        }

        const sumGWA = this.students.reduce((acc, student) => acc + student.gwa, 0);
        const avgGWA = (sumGWA / total).toFixed(2);
        document.getElementById('stat-overall-gwa').textContent = avgGWA;

        const sorted = [...this.students].sort((a, b) => b.gwa - a.gwa);
        document.getElementById('stat-top-student').textContent = sorted[0].fullName;

        const passedCount = this.students.filter(s => s.getAcademicStatus() === 'Passed').length;
        const passRate = Math.round((passedCount / total) * 100);
        document.getElementById('stat-pass-rate').textContent = `${passRate}%`;
    }

    initChart() {
        const canvasElement = document.getElementById('campusChart');
        if (!canvasElement) return;

        const ctx = canvasElement.getContext('2d');
        this.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Average GWA per Campus',
                    data: [],
                    backgroundColor: 'rgba(79, 70, 229, 0.75)',
                    borderColor: 'rgba(79, 70, 229, 1)',
                    borderWidth: 1.5,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: '#f1f5f9' }
                    },
                    x: {
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
        this.updateChart();
    }

    updateChart() {
        if (!this.chartInstance) return;

        const campusMap = {};
        this.students.forEach(s => {
            if (!campusMap[s.campus]) {
                campusMap[s.campus] = { totalGwa: 0, count: 0 };
            }
            campusMap[s.campus].totalGwa += s.gwa;
            campusMap[s.campus].count += 1;
        });

        const labels = Object.keys(campusMap);
        const averages = labels.map(c => (campusMap[c].totalGwa / campusMap[c].count).toFixed(2));

        this.chartInstance.data.labels = labels.map(l => l.replace(' Campus', '').replace(' Extension Unit', ' Ext.'));
        this.chartInstance.data.datasets[0].data = averages;
        this.chartInstance.update();
    }

    render() {
        this.updateDashboardStats();
        this.updateChart();

        const campusFilter = document.getElementById('filter-campus').value;
        const searchQuery = document.getElementById('search-input').value;
        const rankedList = this.getRankedStudents(campusFilter, searchQuery);
        
        const tbody = document.getElementById('student-table-body');
        const emptyState = document.getElementById('empty-state');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (rankedList.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        } else {
            emptyState.classList.add('hidden');
        }

        rankedList.forEach((student, index) => {
            const rank = index + 1;
            const status = student.getAcademicStatus();
            const isPassed = status === 'Passed';
            
            let rankBadge = `<span class="font-semibold text-slate-500">#${rank}</span>`;
            if (campusFilter === 'ALL' && searchQuery === '') {
                if (rank === 1) rankBadge = `<span class="inline-flex items-center justify-center w-6 h-6 bg-amber-100 text-amber-600 rounded-full font-bold text-xs"><i class="fa-solid fa-crown text-amber-500"></i></span>`;
                else if (rank === 2) rankBadge = `<span class="inline-flex items-center justify-center w-6 h-6 bg-slate-200 text-slate-600 rounded-full font-bold text-xs">2</span>`;
                else if (rank === 3) rankBadge = `<span class="inline-flex items-center justify-center w-6 h-6 bg-amber-800/10 text-amber-800 rounded-full font-bold text-xs">3</span>`;
            }

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50/80 transition';
            tr.innerHTML = `
                <td class="py-3 px-4 font-medium">${rankBadge}</td>
                <td class="py-3 px-4">
                    <div class="font-bold text-slate-800">${student.fullName}</div>
                    <div class="text-[10px] text-slate-400">ID: ${student.id}</div>
                </td>
                <td class="py-3 px-4 text-slate-600">
                    <span class="inline-block max-w-[150px] truncate" title="${student.campus}">${student.campus}</span>
                </td>
                <td class="py-3 px-4 text-slate-600 font-medium">${student.course} - ${student.section}</td>
                <td class="py-3 px-4 text-center text-slate-600">${student.prelim.toFixed(1)}</td>
                <td class="py-3 px-4 text-center text-slate-600">${student.midterm.toFixed(1)}</td>
                <td class="py-3 px-4 text-center text-slate-600">${student.final.toFixed(1)}</td>
                <td class="py-3 px-4 text-center font-bold text-slate-800 bg-slate-50/50">${student.gwa.toFixed(2)}</td>
                <td class="py-3 px-4 text-center">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-semibold ${isPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
                        ${status}
                    </span>
                </td>
                <td class="py-3 px-4 text-right">
                    <button onclick="systemManager.removeStudent('${student.id}')" 
                        class="text-slate-400 hover:text-rose-600 p-1.5 transition rounded-lg hover:bg-rose-50" title="Delete Record">
                        <i class="fa-solid fa-trash-alt"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

const systemManager = new GradeSystemManager();

document.addEventListener('DOMContentLoaded', () => {
    const studentForm = document.getElementById('student-form');
    const resetBtn = document.getElementById('btn-reset-form');
    const searchInput = document.getElementById('search-input');
    const filterCampus = document.getElementById('filter-campus');
    const clearAllBtn = document.getElementById('btn-clear-all');

    if (studentForm) {
        studentForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const id = document.getElementById('student-id').value.trim();
            const fullName = document.getElementById('full-name').value.trim();
            const campus = document.getElementById('campus').value;
            const course = document.getElementById('course').value.trim().toUpperCase();
            const section = document.getElementById('section').value.trim().toUpperCase();
            const prelim = document.getElementById('prelim-grade').value;
            const midterm = document.getElementById('midterm-grade').value;
            const final = document.getElementById('final-grade').value;

            const duplicate = systemManager.students.some(s => s.id === id);
            if (duplicate) {
                alert(`Student ID "${id}" is already registered. Please provide a unique ID.`);
                return;
            }

            const newStudent = new Student(id, fullName, campus, course, section, prelim, midterm, final);
            
            systemManager.addStudent(newStudent);
            studentForm.reset();
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            document.getElementById('student-form').reset();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => systemManager.render());
    }

    if (filterCampus) {
        filterCampus.addEventListener('change', () => systemManager.render());
    }

    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => systemManager.clearAllStudents());
    }

    systemManager.render();
});