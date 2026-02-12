let chart;

document.getElementById('runBtn').addEventListener('click', simulate);

document.getElementById('betaInput').oninput = e => document.getElementById('betaVal').innerText = e.target.value;
document.getElementById('gammaInput').oninput = e => document.getElementById('gammaVal').innerText = e.target.value;

function simulate() {
    const N = parseInt(document.getElementById('popInput').value);
    const beta = parseFloat(document.getElementById('betaInput').value);
    const gamma = parseFloat(document.getElementById('gammaInput').value);

    let S = N - 1, I = 1, R = 0;
    const dataS = [S], dataI = [I], dataR = [R], labels = [0];

    for (let t = 1; t <= 100; t++) {
        let newInfected = (beta * S * I) / N;
        let newRecovered = gamma * I;
        S -= newInfected;
        I += newInfected - newRecovered;
        R += newRecovered;

        labels.push("Dia " + t);
        dataS.push(S.toFixed(0));
        dataI.push(I.toFixed(0));
        dataR.push(R.toFixed(0));
    }

    updateChart(labels, dataS, dataI, dataR);
}

function updateChart(labels, S, I, R) {
    const ctx = document.getElementById('sirChart').getContext('2d');
    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Suscetíveis', data: S, borderColor: '#ECC440', backgroundColor: '#ECC44033', fill: true },
                { label: 'Infetados', data: I, borderColor: '#282828', fill: false, borderWidth: 3 },
                { label: 'Recuperados', data: R, borderColor: '#61B695', backgroundColor: '#61B69533', fill: true }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: 'Simulação Epidémica MEDCEI', font: { size: 18, family: 'Roboto' } }
            }
        }
    });
}

simulate();
