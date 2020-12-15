const cdk8s = require("cdk8s");
const fs = require("fs");
const yaml = require("js-yaml");

function getChartManifests(valuesFile) {
    const app = new cdk8s.App();
    const chart = new DeployerChart(app, valuesFile);

    console.log(
        `Generated manifests for ${valuesFile}`,
        chart.toJson().map(doc => yaml.safeDump(doc)).join('---\n')
    );

    return chart.chart.apiObjects;
}

function validateRequiredLabels(apiObjects) {
    apiObjects.forEach((object) => {
        expect(object.metadata.labels["app.kubernetes.io/name"]).toBeDefined();
        expect(object.metadata.labels["app.kubernetes.io/instance"]).toBeDefined();
        expect(object.metadata.labels["app.kubernetes.io/version"]).toBeDefined();
        expect(object.metadata.labels["app.kubernetes.io/managed-by"]).toBeDefined();

        expect(object.metadata.labels["app.kubernetes.io/managed-by"]).toEqual("Helm");
    });
}

class DeployerChart extends cdk8s.Chart {
    constructor(scope, valuesFile) {
        super(scope, "test");

        const values = yaml.safeLoad(fs.readFileSync(`${__dirname}/values/${valuesFile}.yaml`, 'utf8'));

        this.chart = new cdk8s.Helm(this, 'test', {
            chart: '../',
            values,
        });
    }
}

module.exports = {
    getChartManifests,
    validateRequiredLabels,
};