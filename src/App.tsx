import { useRef, useState } from 'react';
import { IRefPhaserGame, PhaserGame } from './game/PhaserGame';
import { MainMenu } from './game/scenes/MainMenu';
import './App.css'; 

function App() {
    const [canMoveSprite, setCanMoveSprite] = useState(true);
    const phaserRef = useRef<IRefPhaserGame | null>(null);

    const changeScene = () => {
        const scene = phaserRef.current?.scene as MainMenu;
        scene?.changeScene();
    };

    const handleSceneChange = (scene: Phaser.Scene) => {
        setCanMoveSprite(scene.scene.key !== 'MainMenu');
    };

    return (
        <div id="app">
            <PhaserGame ref={phaserRef} currentActiveScene={handleSceneChange} />
        </div>
    );
}

export default App;
