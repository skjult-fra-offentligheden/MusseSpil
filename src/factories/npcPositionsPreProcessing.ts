export function getNPCPositions(npcSpawnLayer: Phaser.Tilemaps.ObjectLayer) {
    const positions: { [npcName: string]: { x: number; y: number } } = {};

    npcSpawnLayer.objects.forEach((objData) => {
        const npcName = objData.name;
        let x = objData.x;
        let y = objData.y;

        if (!objData.point) {
            x += objData.width! * 0.5;
            y -= objData.height! * 0.5;
        }
        positions[npcName] = { x, y };
    });

    return positions;
}