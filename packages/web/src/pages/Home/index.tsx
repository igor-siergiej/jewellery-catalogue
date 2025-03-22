import { useContext } from 'react';
import { Store } from '../../components/Store';

const Home = () => {
    const storeContext = useContext(Store);

    return <span>Hello {storeContext.state.user?.firstName}</span>;
};

export default Home;
