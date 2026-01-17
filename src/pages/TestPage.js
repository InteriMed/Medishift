import React from 'react';
import PulseDotLoader from '../components/LoadingAnimations/PulseDotLoader';
import WaveLoader from '../components/LoadingAnimations/WaveLoader';
import BarsLoader from '../components/LoadingAnimations/BarsLoader';
import SpinningRingLoader from '../components/LoadingAnimations/SpinningRingLoader';
import OrbitLoader from '../components/LoadingAnimations/OrbitLoader';
import ProgressLoader from '../components/LoadingAnimations/ProgressLoader';
import RippleLoader from '../components/LoadingAnimations/RippleLoader';
import SpinnerLoader from '../components/LoadingAnimations/SpinnerLoader';
import SkeletonLoader from '../components/LoadingAnimations/SkeletonLoader';

const TestPage = () => {
  return (
    <div>
      <div>
        <div>
          <h1>Custom Loading Animations</h1>
          <p>A collection of custom-built loading animations created from scratch</p>
        </div>
        
        <section>
          <div>
            <h2>Pulse Dot Loader</h2>
            <p>Synchronized pulsing dots with staggered animation</p>
          </div>
          <div>
            <div>
              <div>
                <h3>Small</h3>
                <div>
                  <span>Primary</span>
                </div>
              </div>
              <div>
                <PulseDotLoader size="small" color="primary" />
              </div>
              <div>
                <code>PulseDotLoader size="small"</code>
              </div>
            </div>
            
            <div>
              <div>
                <h3>Medium</h3>
                <div>
                  <span>Primary</span>
                </div>
              </div>
              <div>
                <PulseDotLoader size="medium" color="primary" />
              </div>
              <div>
                <code>PulseDotLoader size="medium"</code>
              </div>
            </div>
            
            <div>
              <div>
                <h3>Large</h3>
                <div>
                  <span>Secondary</span>
                </div>
              </div>
              <div>
                <PulseDotLoader size="large" color="secondary" />
              </div>
              <div>
                <code>PulseDotLoader size="large"</code>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div>
            <h2>Wave Loader</h2>
            <p>Vertical bars creating a wave effect</p>
          </div>
          <div>
            <div>
              <div>
                <h3>Small</h3>
                <div>
                  <span>Primary</span>
                </div>
              </div>
              <div>
                <WaveLoader size="small" color="primary" />
              </div>
              <div>
                <code>WaveLoader size="small"</code>
              </div>
            </div>
            
            <div>
              <div>
                <h3>Medium</h3>
                <div>
                  <span>Primary</span>
                </div>
              </div>
              <div>
                <WaveLoader size="medium" color="primary" />
              </div>
              <div>
                <code>WaveLoader size="medium"</code>
              </div>
            </div>
            
            <div>
              <div>
                <h3>Large</h3>
                <div>
                  <span>Secondary</span>
                </div>
              </div>
              <div>
                <WaveLoader size="large" color="secondary" />
              </div>
              <div>
                <code>WaveLoader size="large"</code>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div>
            <h2>Bars Loader</h2>
            <p>Animated bars with varying heights</p>
          </div>
          <div>
            <div>
              <div>
                <h3>Small</h3>
                <div>
                  <span>Primary</span>
                </div>
              </div>
              <div>
                <BarsLoader size="small" color="primary" />
              </div>
              <div>
                <code>BarsLoader size="small"</code>
              </div>
            </div>
            
            <div>
              <div>
                <h3>Medium</h3>
                <div>
                  <span>Primary</span>
                </div>
              </div>
              <div>
                <BarsLoader size="medium" color="primary" />
              </div>
              <div>
                <code>BarsLoader size="medium"</code>
              </div>
            </div>
            
            <div>
              <div>
                <h3>Large</h3>
                <div>
                  <span>Secondary</span>
                </div>
              </div>
              <div>
                <BarsLoader size="large" color="secondary" />
              </div>
              <div>
                <code>BarsLoader size="large"</code>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div>
            <h2>Spinning Ring Loader</h2>
            <p>Multiple concentric rings rotating at different speeds</p>
          </div>
          <div>
            <div>
              <div>
                <h3>Small</h3>
                <div>
                  <span>Primary</span>
                </div>
              </div>
              <div>
                <SpinningRingLoader size="small" color="primary" />
              </div>
              <div>
                <code>SpinningRingLoader size="small"</code>
              </div>
            </div>
            
            <div>
              <div>
                <h3>Medium</h3>
                <div>
                  <span>Primary</span>
                </div>
              </div>
              <div>
                <SpinningRingLoader size="medium" color="primary" />
              </div>
              <div>
                <code>SpinningRingLoader size="medium"</code>
              </div>
            </div>
            
            <div>
              <div>
                <h3>Large</h3>
                <div>
                  <span>Secondary</span>
                </div>
              </div>
              <div>
                <SpinningRingLoader size="large" color="secondary" />
              </div>
              <div>
                <code>SpinningRingLoader size="large"</code>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div>
            <h2>Orbit Loader</h2>
            <p>Dots orbiting around a central point</p>
          </div>
          <div>
            <div>
              <div>
                <h3>Small</h3>
                <div>
                  <span>Primary</span>
                </div>
              </div>
              <div>
                <OrbitLoader size="small" color="primary" />
              </div>
              <div>
                <code>OrbitLoader size="small"</code>
              </div>
            </div>
            
            <div>
              <div>
                <h3>Medium</h3>
                <div>
                  <span>Primary</span>
                </div>
              </div>
              <div>
                <OrbitLoader size="medium" color="primary" />
              </div>
              <div>
                <code>OrbitLoader size="medium"</code>
              </div>
            </div>
            
            <div>
              <div>
                <h3>Large</h3>
                <div>
                  <span>Secondary</span>
                </div>
              </div>
              <div>
                <OrbitLoader size="large" color="secondary" />
              </div>
              <div>
                <code>OrbitLoader size="large"</code>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div>
            <h2>Progress Loader</h2>
            <p>Animated progress bar with gradient and shine effect</p>
          </div>
          <div>
            <div>
              <div>
                <h3>Small</h3>
                <div>
                  <span>Primary</span>
                </div>
              </div>
              <div>
                <ProgressLoader size="small" color="primary" />
              </div>
              <div>
                <code>ProgressLoader size="small"</code>
              </div>
            </div>
            
            <div>
              <div>
                <h3>Medium</h3>
                <div>
                  <span>Primary</span>
                </div>
              </div>
              <div>
                <ProgressLoader size="medium" color="primary" />
              </div>
              <div>
                <code>ProgressLoader size="medium"</code>
              </div>
            </div>
            
            <div>
              <div>
                <h3>Large</h3>
                <div>
                  <span>Secondary</span>
                </div>
              </div>
              <div>
                <ProgressLoader size="large" color="secondary" />
              </div>
              <div>
                <code>ProgressLoader size="large"</code>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div>
            <h2>Ripple Loader</h2>
            <p>Expanding ripple circles from center</p>
          </div>
          <div>
            <div>
              <div>
                <h3>Small</h3>
                <div>
                  <span>Primary</span>
                </div>
              </div>
              <div>
                <RippleLoader size="small" color="primary" />
              </div>
              <div>
                <code>RippleLoader size="small"</code>
              </div>
            </div>
            
            <div>
              <div>
                <h3>Medium</h3>
                <div>
                  <span>Primary</span>
                </div>
              </div>
              <div>
                <RippleLoader size="medium" color="primary" />
              </div>
              <div>
                <code>RippleLoader size="medium"</code>
              </div>
            </div>
            
            <div>
              <div>
                <h3>Large</h3>
                <div>
                  <span>Secondary</span>
                </div>
              </div>
              <div>
                <RippleLoader size="large" color="secondary" />
              </div>
              <div>
                <code>RippleLoader size="large"</code>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div>
            <h2>Spinner Loader</h2>
            <p>Classic rotating spinner with border animation</p>
          </div>
          <div>
            <div>
              <div>
                <h3>Small</h3>
                <div>
                  <span>Primary</span>
                </div>
              </div>
              <div>
                <SpinnerLoader size="small" color="primary" />
              </div>
              <div>
                <code>SpinnerLoader size="small"</code>
              </div>
            </div>
            
            <div>
              <div>
                <h3>Medium</h3>
                <div>
                  <span>Primary</span>
                </div>
              </div>
              <div>
                <SpinnerLoader size="medium" color="primary" />
              </div>
              <div>
                <code>SpinnerLoader size="medium"</code>
              </div>
            </div>
            
            <div>
              <div>
                <h3>Large</h3>
                <div>
                  <span>Secondary</span>
                </div>
              </div>
              <div>
                <SpinnerLoader size="large" color="secondary" />
              </div>
              <div>
                <code>SpinnerLoader size="large"</code>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div>
            <h2>Skeleton Loader</h2>
            <p>Shimmering skeleton lines for content placeholders</p>
          </div>
          <div>
            <div>
              <div>
                <h3>Small</h3>
                <div>
                  <span>Primary</span>
                </div>
              </div>
              <div>
                <SkeletonLoader size="small" color="primary" />
              </div>
              <div>
                <code>SkeletonLoader size="small"</code>
              </div>
            </div>
            
            <div>
              <div>
                <h3>Medium</h3>
                <div>
                  <span>Primary</span>
                </div>
              </div>
              <div>
                <SkeletonLoader size="medium" color="primary" />
              </div>
              <div>
                <code>SkeletonLoader size="medium"</code>
              </div>
            </div>
            
            <div>
              <div>
                <h3>Large</h3>
                <div>
                  <span>Secondary</span>
                </div>
              </div>
              <div>
                <SkeletonLoader size="large" color="secondary" />
              </div>
              <div>
                <code>SkeletonLoader size="large"</code>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TestPage;
